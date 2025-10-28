/**
 * common.js
 * * すべてのタブで共通する設定、ヘルパー関数、およびESCキー処理を含む
 * * 修正点: highlightRowの自動解除を削除し、ハイライトを保持するように変更。
 * * 修正点: 通知ロジックを showNotification / showNotificationToast に一元化。
 */

// ------------------------------------------------------------------
// --- 0. グローバル変数/初期設定 & AJAX関数 ---
// ------------------------------------------------------------------

// ロール情報を取得 (管理者/一般ユーザーの制御用)
const body = document.querySelector('body');
const userRole = body.getAttribute('data-user-role');
const isAdmin = userRole === 'ADMIN';

// ------------------------------------------------------------------
// --- 新規追加: アクティブタブID取得ヘルパー関数 (変更なし) ---
// ------------------------------------------------------------------

/**
 * 現在チェックされているタブのIDを取得する。
 * @returns {string} アクティブなタブのID (例: 'tab1', 'tab2', 'tab3')。見つからない場合は 'tab1' (駐車場予約リスト) をデフォルトとする。
 */
function getCheckedTabId() {
    // name="tabs" のラジオボタンのうち、checked状態のものを探す
    const checkedTabInput = document.querySelector('input[name="tabs"]:checked');
    // ラジオボタンのID (e.g., tab1, tab2, tab3) を返す
    return checkedTabInput ? checkedTabInput.id : 'tab1'; 
}

// --- 💡 修正適用: 行ハイライト関数 (highlightRow) ---

/**
 * 指定されたテーブル行を一時的にハイライトする。
 * (CSSに .highlight-row クラスの定義が必要です)
 * @param {HTMLElement} row - ハイライトする <tr> 要素
 */
function highlightRow(row) {
    if (row && row.tagName === 'TR') {
        // 1. 該当のテーブル全体で、既存のハイライトを解除
        const table = row.closest('.excel-table');
        if (table) {
            table.querySelectorAll('tr.highlight-row').forEach(highlightedRow => {
                highlightedRow.classList.remove('highlight-row');
            });
        }
        
        // 2. 新しくハイライトクラスを追加
        row.classList.add('highlight-row');
        
        // 🔴 修正: setTimeoutによる自動解除処理を削除。ハイライトは次の更新まで保持されます。
    }
}
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// --- 1. 通知関数 (持続的な表示ロジックを保持) ---
// ------------------------------------------------------------------

// --- トースト通知関数 (showNotificationToast) ---
/**
 * 画面右上のトースト通知を表示する。
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 通知のタイプ ('success', 'error', 'info'など)
 */
function showNotificationToast(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    const messageSpan = document.getElementById('notification-message');

    if (!toast || !messageSpan) return;

    messageSpan.textContent = message;
    
    // スタイルをリセットし、新しいタイプを設定
    toast.className = 'notification-toast'; // クラスをリセット
    toast.classList.add(`notification-${type}`);
    toast.classList.add('show');

    // 5秒後にトーストを非表示にする
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}


/**
 * 操作結果を固定フィールドに記録する。（競合対策のため、この関数でトースト通知は行わない）
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 通知のタイプ ('success', 'error', 'info'など)
 * @param {string} targetTabId - 結果を記録する固定フィールドに対応するタブID (例: 'tab1')
 */
function showNotification(message, type = 'success', targetTabId = 'tab1') {
    // 💡 固定フィールドのIDを動的に生成
    const resultField = document.getElementById(`last-operation-result-${targetTabId}`);
    const resultSpan = resultField ? resultField.querySelector('span') : null;

    // 固定フィールドへの書き込み (次の操作まで保持するロジック)
    if (resultSpan && resultField) {
        // メッセージをそのまま表示
        resultSpan.textContent = message;
        
        // 固定フィールドのスタイルを更新
        const color = (type === 'success' ? 'green' : 'red');
        resultSpan.style.color = color;
        resultSpan.style.fontWeight = 'bold';
    }
}

// ------------------------------------------------------------------
// --- 既存: 表示用フィールド名・値の変換ヘルパー関数 (微調整) ---
// ------------------------------------------------------------------

/**
 * データベース上のフィールド名をユーザー向け表示名に変換する。
 * @param {string} field - データベース上のフィールド名 (例: 'parkingStatus')
 * @returns {string} 表示名 (例: '駐車状況')
 */
function getDisplayFieldName(field) {
    // 既知のフィールドに対する変換
    switch (field) {
        case 'parkingStatus':
            return '駐車状況';
        case 'carNumber':
            return '車両ナンバー';
        case 'departureTime':
            return '出庫時刻';
        case 'visitSituation':
            return '来館状況';
        case 'busStatus':
            return 'バス状況';
        case 'arrivalTime':
            return '入庫時刻';
        case 'passengers':
            return '乗客数';
        case 'remarksColumn': 
            return '備考欄';
        case 'parkingPermit':
            return '駐車証No.';
        case 'parkingPosition':
            return '駐車位置';
        case 'compilationCmpTime':
            return '対応完了時刻';
        case 'emptybusDepTime':
            return '下車済バス出庫時刻';
        case 'scheduledDepTime':
            return '参列者出発予定時刻';
        // その他の汎用的な変換 (キャメルケースを想定)
        default:
            if (field.includes('Name')) return '名前';
            if (field.includes('Number')) return '番号';
            if (field.includes('Time')) return '時刻';
            if (field.includes('Status')) return 'ステータス';
            if (field.includes('Date')) return '日付';
            
            return field;
    }
}

/**
 * データベース上の値とフィールド名に基づいて、ユーザー向け表示値に変換する。
 * @param {string} field - データベース上のフィールド名
 * @param {string} value - データベース上の値
 * @returns {string} 表示値
 */
function getDisplayValue(field, value) {
    // 値が空または null の場合の処理を強化
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        if (field.includes('Time')) {
            return '(時刻なし)';
        }
        return '(空)';
    }
    
    // ステータス系の変換
    if (field === 'parkingStatus') {
        switch (value) {
            case '1':
                return '予約中';
            case '2':
                return '入庫済';
            case '3':
                return '出庫済';
            default:
                return value;
        }
    } else if (field === 'visitSituation') {
        switch (value) {
            case '1':
                return '予約中';
            case '2':
                return '来館済';
            case '3':
                return '退館済';
            default:
                return value;
        }
    } else if (field === 'busStatus') {
        switch (value) {
            case '1':
                return '予約中';
            case '2':
                return '下車済(駐車中)';
            case '3':
                return '乗車済(待機中)';
            case '4':
                return '出庫済';
            default:
                return value;
        }
    }
    
    // 乗車数 ('passengers') の変換
    if (field === 'passengers') {
        return `${value}名`;
    }
    
    return value;
}

// ------------------------------------------------------------------
// --- sendUpdateToServer 関数 (修正適用) ---
// ------------------------------------------------------------------

/**
 * サーバーに更新リクエストを送信する汎用関数
 * @param {string} apiPath - APIのエンドポイント (例: '/api/parking/update', '/api/visitor/update')
 * @param {string} id - レコードID
 * @param {string} field - 更新対象のフィールド名 (例: 'carNumber', 'parkingStatus')
 * @param {string} value - 新しい値
 * @param {string} [extraField] - 追加で更新するフィールド名 (例: 'departureTime')
 * @param {string} [extraValue] - 追加フィールドの値 (例: フォーマット済み現在時刻)
 * @param {string} [targetTabId] - 結果を記録する固定フィールドに対応するタブID (例: 'tab1') 
 * @returns {Promise<any>}
 */
function sendUpdateToServer(apiPath, id, field, value, extraField = null, extraValue = null, targetTabId = 'tab1') { 
   
   const token = document.querySelector('meta[name="_csrf"]')?.content;
   const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;
   
   const headers = {
       'Content-Type': 'application/json',
   };
   if (headerName && token) {
       headers[headerName] = token;
   }
   
   let bodyObject = {
       id: id,
       field: field,
       value: value
   };

   if (extraField && extraValue !== null) {
       bodyObject.extraField = extraField;
       bodyObject.extraValue = extraValue;
   }
   
   // 現在アクティブなタブIDを通知先として取得
   const notificationTargetId = getCheckedTabId();
   
   return fetch(apiPath, {
       method: 'POST',
       headers: headers,
       body: JSON.stringify(bodyObject)
       })
   .then(response => {
       if (!response.ok) {
           return response.text().then(text => { 
               let message = text || 'サーバーエラー (' + response.status + ')';
               
               if (response.status === 403) {
                    message = 'アクセスが拒否されました (403 Forbidden)。権限を確認してください。';
               } else if (response.status === 400) {
                    message = `入力エラーが発生しました: ${message}`;
               }
               
               const errorMessage = `更新に失敗しました。${message.substring(0, 100)}`;

               // 💡 エラー時も固定フィールドとトースト通知を表示
               showNotification(errorMessage, 'error', notificationTargetId); 
               showNotificationToast(errorMessage, 'error');

               throw new Error(message); 
           });
       }
       
       // ★★★ 成功したら通知を表示 (統一フォーマットを適用) ★★★
       
       // 1. 変換
       const displayField = getDisplayFieldName(field);
       const displayValue = getDisplayValue(field, value);
       
       // メッセージの先頭に ID を追加
       let successMessage = `ID: ${id} - 更新情報：【${displayField}】が【${displayValue}】に更新されました！`;
       
       if (extraField && extraValue !== null) {
            // 2. 追加フィールドの変換
            const extraDisplayField = getDisplayFieldName(extraField);
            const extraDisplayValue = getDisplayValue(extraField, extraValue);
            
            // 複数のフィールドが更新された場合のメッセージ（先頭にIDを付与）
            successMessage = `ID: ${id} - 更新情報：【${displayField}】が【${displayValue}】に更新されました！さらに【${extraDisplayField}】も【${extraDisplayValue}】に更新されました。`;
       }
       
       // 確定した通知先IDを使用して固定フィールドに表示
       showNotification(successMessage, 'success', notificationTargetId); 
       
       // トースト通知も表示
       showNotificationToast(successMessage, 'success');
       
       return response.json(); 
   });
}
// ------------------------------------------------------------------
// --- ヘルパー関数 (変更なし) ---
// ------------------------------------------------------------------

/**
 * 現在時刻を 'yyyy/MM/dd HH:mm' 形式に整形するヘルパー関数
 * @param {Date} date - 整形対象のDateオブジェクト
 * @returns {string} 整形された時刻文字列
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 現在時刻を "HH:mm:ss" 形式で返すヘルパー関数 (バス用)
 */
function getFormattedCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}


// ------------------------------------------------------------------
// --- グローバルな処理 (DOMコンテンツロード後) (修正適用) ---
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    
    // --- ページロード時の通知メッセージ処理（URLパラメータ経由） ---
    
    const urlParams = new URLSearchParams(window.location.search);
    const successMsg = urlParams.get('successMessage');
    const errorMsg = urlParams.get('errorMessage');
    // 💡 activeTabパラメータを取得
    const activeTabId = urlParams.get('activeTab') || 'tab1'; 

    if (successMsg) {
        let message;
        try {
            message = decodeURIComponent(successMsg);
        } catch (e) {
            message = successMsg;
        }
        // 固定フィールドに表示
        showNotification(message, 'success', activeTabId); 
        // トースト通知を表示
        showNotificationToast(message, 'success');
        
        // URLパラメータは一度使用したらクリアすることを推奨
        history.replaceState(null, '', window.location.pathname);
    } else if (errorMsg) {
        let message;
        try {
            message = decodeURIComponent(errorMsg);
        } catch (e) {
            message = errorMsg;
        }
        // 固定フィールドに表示
        showNotification(message, 'error', activeTabId); 
        // トースト通知を表示
        showNotificationToast(message, 'error');
        
        history.replaceState(null, '', window.location.pathname);
    }
    
    // --- 既存のThymeleafメッセージ処理 (CSVインポート画面用) ---
    const thymeleafMessages = document.querySelectorAll('.message-success, .message-error');
    if (thymeleafMessages.length > 0) {
        const messageElement = thymeleafMessages[0];
        const messageText = messageElement.textContent.trim();
        const isSuccess = messageElement.classList.contains('message-success');
        const type = isSuccess ? 'success' : 'error';
        
        // 現在チェックされているタブをヘルパー関数で取得し通知先とする
        const tabIdForCsv = getCheckedTabId(); 

        showNotification(messageText, type, tabIdForCsv); 
        showNotificationToast(messageText, type); // 💡 トーストも表示
        
        // 既存のメッセージ要素を非表示にする
        messageElement.style.display = 'none';
    }
});


// ------------------------------------------------------------------
// --- 7. グローバルな処理 (ESCキーで編集モードを閉じる) (変更なし) ---
// ------------------------------------------------------------------
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // 編集モードとして開く可能性がある全てのラッパーを検索
        document.querySelectorAll('.edit-mode, .edit-mode-select, .vehicle-number-edit-form, .remarks-edit-form, .passengers-edit-form').forEach(wrapper => {
            if (wrapper.style.display !== 'none' && wrapper.style.visibility !== 'hidden') {
                const cell = wrapper.closest('td');
                if (cell) {
                    const textSpan = cell.querySelector('.permit-number-text') || 
                                     cell.querySelector('.view-mode-text') ||
                                     cell.querySelector('.situation-text') ||
                                     cell.querySelector('.vehicle-number-text') ||
                                     cell.querySelector('.remarks-text') ||
                                     cell.querySelector('.passengers-text');
                    
                    // 編集前の値に戻す処理
                    if (wrapper.classList.contains('vehicle-number-edit-form')) {
                        const input = wrapper.querySelector('.vehicle-number-input');
                        // data-original-valueから値を取得
                        const originalValue = textSpan ? textSpan.getAttribute('data-original-value') : '';
                        if (input) input.value = originalValue;
                    } else if (wrapper.classList.contains('remarks-edit-form')) {
                        const textarea = wrapper.querySelector('.remarks-textarea');
                        const originalValue = textSpan ? textSpan.getAttribute('data-original-value') : '';
                        if (textarea) textarea.value = originalValue;
                    } else if (wrapper.classList.contains('passengers-edit-form')) {
                        const input = wrapper.querySelector('.passengers-input');
                        const originalValue = textSpan ? textSpan.getAttribute('data-original-value') : '';
                        if (input) input.value = originalValue;
                    }
                    
                    if (textSpan) {
                        textSpan.style.display = 'inline-block';
                        textSpan.style.visibility = 'visible';
                    }
                    
                    // 編集モードを非表示に戻す
                    wrapper.style.display = 'none';
                    wrapper.style.visibility = 'hidden';
                    
                    // バスリストのis-editingクラスも除去
                    if (cell.classList.contains('is-editing')) {
                         cell.classList.remove('is-editing');
                    }
                }
            }
        });
    }
});