/**
 * common.js
 * 複数のタブ (駐車場、来館者、バス) で共通して使用される機能を提供します。
 * 主な機能:
 * 1. WebSocket (STOMP/SockJS) 接続と通知処理
 * 2. サーバーへのデータ更新APIの呼び出し (sendUpdateToServer)
 * 3. UIの通知表示 (showNotification, showNotificationToast)
 * 4. UIのハイライト処理
 * 5. 日付フォーマット
 *
 * 修正 V7.9: sendUpdateToServer の成功時通知において、サーバーレスポンスに message フィールドが
 * 存在しない場合にフォールバックメッセージ（IDとフィールド名を含む）を強制的に表示するように修正。
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
    // 💡 エンドポイントは WebSocketConfig.java で /ws に設定されている前提
    const socket = new SockJS('/ws'); 
    stompClient = Stomp.over(socket);

    stompClient.connect({}, (frame) => {
        console.log('DEBUG: STOMP Connection established: ' + frame);
        
        // サーバーから /topic/updates トピックを購読
        stompClient.subscribe('/topic/updates', (message) => {
            handleRemoteUpdate(message.body);
        });

    }, (error) => {
        // 接続失敗時のエラーハンドリング
        console.error('DEBUG: STOMP Connection Error:', error);
        
        const errorMessage = 'サーバーとの接続が切れました。自動再接続を試みます...';
        if (typeof showNotificationToast === 'function') {
            showNotificationToast(errorMessage, 'warning');
        }
        
        // 💡 5秒後に再接続を試みる
        setTimeout(connect, 5000); 
    });
}

/**
 * リモートから受信した更新メッセージを処理する。
 * @param {string} updateMessageJson - JSON文字列形式の更新メッセージ
 */
function handleRemoteUpdate(updateMessageJson) {
    try {
        const update = JSON.parse(updateMessageJson);
        const { id, field, newValue, extraField, extraValue, updateTime, entityType, message } = update;
        
        if (!id || !field || !entityType) {
            console.warn("WARN: Invalid remote update message received:", update);
            return;
        }
        
        // 💡 トーストで通知
        if (typeof showNotificationToast === 'function') {
             // messageフィールドが存在すればそれを使用する
             const notificationMessage = message || `${entityType} ID: ${id} の ${field} が更新されました。`;
             showNotificationToast(notificationMessage, 'info');
        }
        
        // 💡 各モジュールに定義されたDOM更新関数を呼び出す
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
 * @param {string|null} extraField - 同時に更新する追加フィールド名 (例: departureTime)
 * @param {string|null} extraValue - 追加フィールドの値
 * @param {string} tabId - 通知を表示するタブID
 * @returns {Promise<Object>} - 成功時のレスポンスボディ
 */
async function sendUpdateToServer(endpoint, id, field, value, extraField, extraValue, tabId) {
    // 1. CSRFトークン情報の取得 (POSTリクエストには必須)
    const token = document.querySelector('meta[name="_csrf"]')?.content;
    const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;

    // 2. リクエストボディの構築
    const payload = {
        id: String(id),
        field: field,
        value: value,
        extraField: extraField || '', // nullを空文字列に変換
        extraValue: extraValue || '' // nullを空文字列に変換
    };

    // 3. ヘッダーの構築
    const headers = {
        // 💡 JSONボディを送信するために Content-Type を設定
        'Content-Type': 'application/json', 
    };
    if (headerName && token) {
        headers[headerName] = token; // CSRFヘッダーの追加
    }
    
    // ログ出力（デバッグ用）
    console.log(`DEBUG: API Call to ${endpoint}. Payload:`, payload);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            // 💡 ペイロードをJSON文字列に変換
            body: JSON.stringify(payload) 
        });
        
        // 4. エラー処理
        if (response.status === 400 || response.status === 404 || response.status === 500) {
            // サーバーからの詳細なエラーメッセージを取得
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.message || errorMessage;
            } catch (e) {
                // JSON解析に失敗した場合（例：HTMLエラーページが返された）
                console.warn("WARN: Failed to parse error response body as JSON.", e);
            }
            // エラーをスローして呼び出し元でキャッチさせる
            throw new Error(`入力エラーが発生しました: ${errorMessage}`);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
             // 成功通知（showNotificationToast関数が存在することを前提とする）
             if (typeof showNotificationToast === 'function') {
                // 💡 修正 V7.9: result.message が存在しない場合のフォールバックメッセージを追加
                const defaultMessage = `ID: ${id} の ${field} を更新しました。`; 
                const notificationMessage = result.message || defaultMessage;
                 
                showNotificationToast(notificationMessage, 'success');
             }
             return result; 
        } else {
             // status: 'error' など、APIで定義されたエラー
             throw new Error(result.message || 'サーバー側で処理エラーが発生しました。');
        }

    } catch (error) {
        console.error("sendUpdateToServer Error:", error);
        // 呼び出し元にエラーを再スロー
        throw error;
    }
}


// ==========================================================
// III. ユーティリティ関数
// ==========================================================

/**
 * Dateオブジェクトを指定された形式 'YYYY/MM/DD HH:mm' にフォーマットする。
 * @param {Date} date - フォーマットする Date オブジェクト
 * @returns {string} フォーマットされた日付文字列
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
 * ページ上部に固定で表示される通知 (トースト)
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 'success', 'error', 'info', 'warning'
 */
function showNotificationToast(message, type = 'info') {
    const toastContainer = document.getElementById('notification-toast-container');
    if (!toastContainer || !message) { // 💡 メッセージが空の場合は表示しない
        console.warn("WARN: showNotificationToast called with empty message or missing container.");
        return;
    }

    const toast = document.createElement('div');
    toast.className = `notification-toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // 3秒後に消えるように設定
    setTimeout(() => {
        toast.classList.add('fade-out');
        // アニメーション完了後にDOMから削除
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}


/**
 * 画面内の特定タブの上部に表示される永続的な通知
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 'success', 'error', 'info'
 * @param {string} targetTabId - 通知を表示するタブのID (例: 'tab1')
 */
function showNotification(message, type, targetTabId) {
    const tabContent = document.getElementById(targetTabId);
    if (!tabContent || !message) return; // 💡 メッセージが空の場合は表示しない
    
    // 既存の通知エリアを取得または作成
    let notificationArea = tabContent.querySelector('.notification-area');
    if (!notificationArea) {
        notificationArea = document.createElement('div');
        notificationArea.className = 'notification-area';
        tabContent.insertBefore(notificationArea, tabContent.firstChild);
    }
    
    // 既存のメッセージを削除
    notificationArea.innerHTML = ''; 

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`; // CSSで alert-success, alert-error などに対応
    alertDiv.textContent = message;

    notificationArea.appendChild(alertDiv);

    // 💡 10秒後に自動的に消えるように設定
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