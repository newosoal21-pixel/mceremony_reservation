/**
 * common.js
 * 複数のタブ (駐車場、来館者、バス) で共通して使用される機能を提供します。
 * * 修正 V8.7: リモート通知時のトースト表示とタブ連動、固定更新情報表示の欠落を修正。
 */

// ==========================================================
// I. WebSocket/STOMP 接続と通知
// ==========================================================

let stompClient = null;

/**
 * WebSocket接続を確立する。
 */
function connect() {
    console.log("DEBUG: Attempting to connect to WebSocket...");
    const socket = new SockJS('/ws'); 
    stompClient = Stomp.over(socket);

    stompClient.connect({}, (frame) => {
        console.log('DEBUG: STOMP Connection established: ' + frame);
        
        stompClient.subscribe('/topic/updates', (message) => {
            handleRemoteUpdate(message.body);
        });

    }, (error) => {
        console.error('DEBUG: STOMP Connection Error:', error);
        
        const errorMessage = 'サーバーとの接続が切れました。自動再接続を試みます...';
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(errorMessage, 'warning');
        }
        
        setTimeout(connect, 5000); 
    });
}

/**
 * リモートから受信した更新メッセージを処理する。
 * @param {string} updateMessageJson - JSON文字列形式の更新メッセージ
 */
function handleRemoteUpdate(updateMessageJson) {
    // 🔴 【修正適用開始】
    // entityTypeに対応する日本語名称を定義する（関数スコープ内）
    const entityNameMap = {
        'parking': '駐車場利用ID',
        'visitor': '来館者ID',
        'bus': '送迎バス運行ID'
    };
    
    try {
        const update = JSON.parse(updateMessageJson);
        // サーバーからの更新メッセージには updateTime が含まれることを想定
        const { id, field, newValue, extraField, extraValue, updateTime, entityType, message } = update;
        
        if (!id || !field || !entityType) {
            console.warn("WARN: Invalid remote update message received:", update);
            return;
        }

        // 日本語名称を取得。見つからない場合は entityType をそのまま使う
        const entityNameJp = entityNameMap[entityType] || entityType.toUpperCase();

        // プレフィックスを日本語名称とIDで作成
        const prefix = `${entityNameJp}: ${id} - `;
        const baseMessage = message || `${field} が更新されました。`;
        const notificationMessage = prefix + baseMessage;
        
        // 1. 💡 修正追加: タブ連動 (リモート更新されたタブに切り替える)
        if (typeof setActiveTab === 'function') {
            setActiveTab(entityType);
        }
        
        // 2. 💡 修正追加: 固定更新情報メッセージを表示 (remoteValueはupdateTimeを使用)
        if (typeof updateLastOperationResult === 'function') {
            updateLastOperationResult(entityType, notificationMessage, updateTime, 'info'); 
        }

        // 3. トーストで通知
        if (typeof showNotificationToast === 'function') {
             showNotificationToast(notificationMessage, 'info');
        }
        
        // 4. 各モジュールに定義されたDOM更新関数を呼び出す
        if (entityType === 'parking' && typeof window.updateParkingRow === 'function') {
            window.updateParkingRow(id, field, newValue, extraField, extraValue, updateTime);
            
        } else if (entityType === 'visitor' && typeof window.updateVisitorRow === 'function') {
             window.updateVisitorRow(id, field, newValue, updateTime);
             
        } else if (entityType === 'bus' && typeof window.updateBusRow === 'function') {
            window.updateBusRow(id, field, newValue, updateTime);
        }
        
    } catch (error) {
        console.error("ERROR: Failed to process remote update message:", error);
    }
}
// 🔴 【修正適用終了】

// ページロード時にWebSocket接続を開始
document.addEventListener('DOMContentLoaded', connect);


// ==========================================================
// II. サーバーへのデータ更新 (共通API呼び出し)
// ==========================================================

/**
 * サーバーの更新APIを呼び出し、成功/失敗を処理する汎用関数
 * @param {string} endpoint - APIエンドポイントのURL (例: /api/parking/update)
 * @param {string} id - 更新するレコードのID
 * @param {string} field - 更新するフィールド名 (例: parkingStatus)
 * @param {string} value - 新しい値 (例: 101, '新ナンバー')
 * @param {string|null} extraField - 同時に更新する追加フィールド名
 * @param {string|null} extraValue - 追加フィールドの値
 * @param {string} tabId - 通知を表示するタブID
 * @returns {Promise<Object>} - 成功時のレスポンスボディ
 */
async function sendUpdateToServer(endpoint, id, field, value, extraField, extraValue, tabId) {
    const token = document.querySelector('meta[name="_csrf"]')?.content;
    const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;

    const payload = {
        id: String(id),
        field: field,
        value: value,
        extraField: extraField || '', 
        extraValue: extraValue || ''
    };

    const headers = {
        'Content-Type': 'application/json', 
    };
    if (headerName && token) {
        headers[headerName] = token; 
    }
    
    console.log(`DEBUG: API Call to ${endpoint}. Payload:`, payload);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.message || errorMessage;
            } catch (e) {
                console.warn("WARN: Failed to parse error response body as JSON.", e);
            }
            throw new Error(`入力エラーが発生しました: ${errorMessage}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
             if (typeof showNotificationToast === 'function') {
                const defaultMessage = `ID: ${id} の ${field} を更新しました。`; 
                const notificationMessage = result.message || defaultMessage;
                 
                showNotificationToast(notificationMessage, 'success');
             }
             return result; 
        } else {
             throw new Error(result.message || 'サーバー側で処理エラーが発生しました。');
        }

    } catch (error) {
        console.error("sendUpdateToServer Error:", error);
        throw error;
    }
}


// ==========================================================
// III. ユーティリティ関数 (欠落していた関数の補完を含む)
// ==========================================================

/**
 * Dateオブジェクトを指定された形式 'YYYY/MM/DD HH:mm' にフォーマットする。
 * @param {Date} date - フォーマットする Date オブジェクト
 * @returns {string} フォーマットされた日付文字列
 */
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 💡 修正追加: 該当するエンティティタイプ（シート）にタブを切り替える
 * @param {string} entityType - 'parking', 'visitor', 'bus'
 */
function setActiveTab(entityType) {
    let radioId;
    if (entityType === 'parking') {
        radioId = 'tab1'; 
    } else if (entityType === 'visitor') {
        radioId = 'tab2'; 
    } else if (entityType === 'bus') {
        radioId = 'tab3'; 
    } else {
        return;
    }
    
    console.log(`DEBUG: Calling setActiveTab(${entityType}) -> radioId: ${radioId}`);

    const radioElement = document.getElementById(radioId);
    if (radioElement && !radioElement.checked) {
        // ラジオボタンをチェックすることでCSS/HTMLが連動してタブが切り替わる
        radioElement.checked = true; 
        console.log(`DEBUG: Tab changed to ${radioId}.`);
    }
}


/**
 * 💡 修正追加: 各タブの .last-operation-result フィールドを更新する（固定更新情報メッセージ）
 * @param {string} entityType - 'parking', 'visitor', 'bus'
 * @param {string} message - 表示するメッセージ
 * @param {string} updateTime - 更新日時 (YYYY/MM/DD HH:mm 形式)
 * @param {string} type - 'success', 'error', 'info'
 */
function updateLastOperationResult(entityType, message, updateTime, type = 'info') {
    let contentId;
    if (entityType === 'parking') {
        contentId = 'content1'; 
    } else if (entityType === 'visitor') {
        contentId = 'content2'; 
    } else if (entityType === 'bus') {
        contentId = 'content3'; 
    } else {
        return;
    }

    const resultField = document.querySelector(`#${contentId} .last-operation-result`);
    if (resultField) {
        // クラスをリセットし、新しいタイプを適用 (CSSで .notification-info, .notification-success などに対応していること)
        resultField.className = 'last-operation-result';
        resultField.classList.add(`notification-${type}`);
        
        // メッセージを設定 (updateTimeはサーバーから来たそのままの値を使用)
        resultField.textContent = `${updateTime || formatDate(new Date())}：${message} `;
        
        console.log(`DEBUG: Updated operation result for ${entityType}.`);
    }
}


/**
 * ページ上部に固定で表示される通知 (トースト)
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 'success', 'error', 'info', 'warning'
 */
function showNotificationToast(message, type = 'info') {
    // 💡 IDで検索。HTMLで <div id="notification-toast-container"> が定義されている必要があります。
    const toastContainer = document.getElementById('notification-toast-container');
    
    if (!toastContainer || !message) { 
        console.warn("WARN: showNotificationToast called with empty message or missing container.");
        return;
    }

    const toast = document.createElement('div');
    // CSSクラス: notification-toast と toast-success/error/info の両方を適用
    toast.className = `notification-toast toast-${type}`; 
    toast.textContent = message;

    // トーストをコンテナの先頭に追加 (新しい通知が上に来るように)
    toastContainer.prepend(toast); 

    // 3秒後に消えるように設定
    setTimeout(() => {
        // フェードアウトのクラスを追加
        toast.classList.add('fade-out'); 
        // アニメーション完了後にDOMから削除
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}


/**
 * 古いバージョンの永続的な通知表示関数 (現在は updateLastOperationResult が推奨される)
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 'success', 'error', 'info'
 * @param {string} targetTabId - 通知を表示するタブのID (例: 'tab1')
 */
function showNotification(message, type, targetTabId) {
    const tabContent = document.getElementById(targetTabId);
    if (!tabContent || !message) return;
    
    let notificationArea = tabContent.querySelector('.notification-area');
    if (!notificationArea) {
        notificationArea = document.createElement('div');
        notificationArea.className = 'notification-area';
        tabContent.insertBefore(notificationArea, tabContent.firstChild);
    }
    
    notificationArea.innerHTML = ''; 

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`; 
    alertDiv.textContent = message;

    notificationArea.appendChild(alertDiv);

    // 10秒後に自動的に消えるように設定
    setTimeout(() => {
        notificationArea.innerHTML = ''; 
    }, 10000);
}


/**
 * 更新されたセルを一時的にハイライトし、IDフィールドもハイライトする
 * @param {HTMLElement} cell - 更新されたテーブルセル (<td>)
 */
function highlightCellAndId(cell) {
    if (!cell) return;
    
    const row = cell.closest('tr');
    if (!row) return;

    // 1. セルをハイライト
    cell.classList.add('highlight-update');
    setTimeout(() => {
        cell.classList.remove('highlight-update');
    }, 1500);
    
    // 2. IDフィールドをハイライト
    const idCell = row.querySelector('.js-id-field');
    if (idCell) {
        idCell.classList.add('highlight-id');
        setTimeout(() => {
            idCell.classList.remove('highlight-id');
        }, 1500);
    }
}