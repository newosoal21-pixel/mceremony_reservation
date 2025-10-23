/**
 * common.js
 * * すべてのタブで共通する設定、ヘルパー関数、およびESCキー処理を含む
 */

// ------------------------------------------------------------------
// --- 0. グローバル変数/初期設定 & AJAX関数 ---
// ------------------------------------------------------------------

// ロール情報を取得 (管理者/一般ユーザーの制御用)
const body = document.querySelector('body');
const userRole = body.getAttribute('data-user-role');
const isAdmin = userRole === 'ADMIN';

/**
 * サーバーに更新リクエストを送信する汎用関数
 * @param {string} apiPath - APIのエンドポイント (例: '/api/parking/update', '/api/visitor/update')
 * @param {string} id - レコードID
 * @param {string} field - 更新対象のフィールド名 (例: 'carNumber', 'parkingStatus')
 * @param {string} value - 新しい値
 * @param {string} [extraField] - 追加で更新するフィールド名 (例: 'departureTime')
 * @param {string} [extraValue] - 追加フィールドの値 (例: フォーマット済み現在時刻)
 * @returns {Promise<any>}
 */
function sendUpdateToServer(apiPath, id, field, value, extraField = null, extraValue = null) {
   
   // 💡 関数内で直接CSRFトークンを取得
   const token = document.querySelector('meta[name="_csrf"]')?.content;
   const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;
   
   // リクエストヘッダーを設定
   const headers = {
       'Content-Type': 'application/json',
   };
   // 取得できた場合のみヘッダーに追加
   if (headerName && token) {
       headers[headerName] = token;
   }
   
   let bodyObject = {
       id: id,
       field: field,
       value: value
   };

   // extraFieldが指定された場合、リクエストボディに追加する
   if (extraField && extraValue !== null) {
       bodyObject.extraField = extraField;
       bodyObject.extraValue = extraValue;
   }
   
   return fetch(apiPath, { // apiPathを使用
       method: 'POST',
       headers: headers,
       body: JSON.stringify(bodyObject)
       })
   .then(response => {
       if (!response.ok) {
           // 💡 response.text() で具体的なエラーメッセージを確認する
           return response.text().then(text => { 
               let message = text || 'サーバーエラー (' + response.status + ')';
               
               // 403エラーの場合、認証に関する具体的なメッセージを表示する
               if (response.status === 403) {
                    message = 'アクセスが拒否されました (403 Forbidden)。認証情報またはCSRFトークンを確認してください。';
               }
               
               // 権限エラーとして新しいエラーをスロー
               throw new Error(message); 
           });
       }
       // 成功した場合のみJSONとしてパース
       return response.json(); 
   });
}

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
// --- 7. グローバルな処理 (ESCキーで編集モードを閉じる) ---
// ------------------------------------------------------------------
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // 編集モードとして開く可能性がある全てのラッパーを検索
        document.querySelectorAll('.edit-mode, .edit-mode-select, .vehicle-number-form, .remarks-edit-form').forEach(wrapper => {
            if (wrapper.style.display !== 'none' && wrapper.style.visibility === 'visible') {
                const cell = wrapper.closest('td');
                if (cell) {
                    const textSpan = cell.querySelector('.permit-number-text') || 
                                     cell.querySelector('.view-mode-text') ||
                                     cell.querySelector('.situation-text') ||
                                     cell.querySelector('.vehicle-number-text') ||
                                     cell.querySelector('.remarks-text');
                    
                    // 編集前の値に戻す処理 (車両ナンバーと備考欄)
                    if (wrapper.classList.contains('vehicle-number-form')) {
                        const input = wrapper.querySelector('.vehicle-number-input');
                        if (textSpan) input.value = textSpan.textContent;
                    } else if (wrapper.classList.contains('remarks-edit-form')) {
                        const textarea = wrapper.querySelector('.remarks-textarea');
                        if (textSpan) textarea.value = textSpan.textContent;
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