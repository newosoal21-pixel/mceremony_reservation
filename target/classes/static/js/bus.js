/**
 * bus.js
 * * 送迎バス運行リスト (#content3) の機能とロジック
 * * 依存: common.js (sendUpdateToServer, formatDate, showNotificationToast, showNotification, highlightCellAndId)
 * * 修正 V8.5:
 * * 1. ローカル通知関数 (updateOperationResultField) を追加。
 * * 2. 入出庫状況、乗車数の更新成功時、このローカル通知関数を強制的に呼び出すロジックを追加し、
 * * メッセージが表示されない問題を解決する。
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: bus.js の実行が開始されました。"); 
    
    const busContent = document.getElementById('content3');
    if (!busContent) return; // タブ3がない場合は終了

    // 💡 ターゲットタブIDとセレクタを定義 (V8.5: 追加)
    const TARGET_TAB_ID = 'tab3';
    const CONTENT_SELECTOR = '#content3';
    
    // ------------------------------------------------------------------
    // 💡 ID取得ヘルパー関数 (V7 追加)
    // ------------------------------------------------------------------
    function getBusRecordId(element) {
        const row = element.closest('tr');
        // 💡 修正点: <tr>から data-bus-id を取得するように変更
        const recordId = row ? row.getAttribute('data-bus-id') : null; 
        if (!recordId) {
            console.error("エラー: 送迎バスレコードID (data-bus-id) が見つかりません。");
        }
        return recordId;
    }


	// ------------------------------------------------------------------
	// 💡 ローカル通知関数 (V8.5: 追加)
	// ------------------------------------------------------------------
    const RESULT_FIELD_IDS = {
        '#content3': "last-operation-result-tab3"
    };

    /**
     * 更新結果を固定表示欄とトーストで表示する
     * @param {string} contentSelector - タブのセレクタ ('#content3')
     * @param {boolean} success - 成功/失敗
     * @param {string} message - 表示するメッセージ
     */
    function updateOperationResultField(contentSelector, success, message) {
        const fieldId = RESULT_FIELD_IDS[contentSelector];
        if (!fieldId) {
            console.error(`結果フィールドIDが見つかりません: ${contentSelector}`);
            return;
        }
        
        const resultDiv = document.getElementById(fieldId);
        const resultSpan = resultDiv ? resultDiv.querySelector('span') : null;

        if (resultDiv) {
            // 見栄え調整
            resultDiv.style.minWidth = '250px';      
            resultDiv.style.maxWidth = '300px';      
            resultDiv.style.wordWrap = 'break-word'; 
            resultDiv.style.whiteSpace = 'normal';   
        }
        
        if (resultSpan) {
            resultSpan.textContent = message;
            resultSpan.style.color = success ? 'green' : 'red';
            resultSpan.style.fontWeight = 'bold';
        }

         // 💡 common.js の showNotificationToast を使ってトースト表示を強制実行
         if (typeof showNotificationToast === 'function') {
             showNotificationToast(message, success ? 'success' : 'error');
         } else {
             console.warn("common.js の showNotificationToast 関数が見つかりません。");
             // 失敗時のみ共通の showNotification にフォールバック
             if (typeof showNotification === 'function' && !success) {
                 showNotification(message, 'error', TARGET_TAB_ID);
             }
         }
    }


	// ==========================================================
	// 1. データストア: 取得した状況データを保持する変数
	// ==========================================================
	let busSituationsData = []; 
    const busTableBody = document.querySelector('#content3 .excel-table tbody'); // テーブルボディをここで取得

	// ==========================================================
	// 2. データの取得: ページロード時にAPIから状況リストを取得する関数
	// ==========================================================
	async function fetchBusSituations() {
	    console.log("DEBUG: fetchBusSituations関数が実行されました。APIを呼び出します。");
	    try {
	        // CSRFトークンは sendUpdateToServer ではなく、直接 fetch に渡す必要がある
            const token = document.querySelector('meta[name="_csrf"]')?.content;
            const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;

            const headers = {};
            if (headerName && token) {
                headers[headerName] = token;
            }

	        const response = await fetch('/api/bus/situations', { headers: headers }); 
	        if (!response.ok) {
	            throw new Error(`HTTP error! status: ${response.status}`);
	        }
	        busSituationsData = await response.json();
	        console.log("DEBUG: BusSituations data loaded:", busSituationsData);
	    } catch (error) {
	        console.error("DEBUG: Failed to fetch bus situations:", error);
	        
            const errorMessage = '入出庫状況の選択肢データをロードできませんでした。';
            // 💡 V8.5: ローカル通知関数でエラー表示
            updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
	    }
	}
    
	// 💡 ページロード時にデータ取得を開始
	fetchBusSituations();

	// ==========================================================
	// 3. セレクタの描画: 編集モードが開かれたときに実行する関数
	// ==========================================================

	/**
	 * 入出庫状況セレクタ (<select>) に <option> タグを生成して挿入する
	 * @param {HTMLElement} selectElement - <select class="js-bus-situation-select"> 要素
	 */
	function populateBusStatusSelect(selectElement) {
	    // 既存のオプションをクリア
	    selectElement.innerHTML = ''; 

	    // ユーザーに選択を促すための最初の空オプション
	    const defaultOption = document.createElement('option');
	    defaultOption.value = '';
	    defaultOption.textContent = '選択してください';
	    selectElement.appendChild(defaultOption);

	    // 取得したデータに基づいてオプションを生成
	    busSituationsData.forEach(situation => {
	        const option = document.createElement('option');
	        option.value = situation.id;      
	        option.textContent = situation.name; // Nameを表示名として使用
	        selectElement.appendChild(option);
	    });
	}
    
    
	// ------------------------------------------------------------------
	// --- 5. 送迎バス運行リスト (content3) の処理 ---
	// ------------------------------------------------------------------

	if (busTableBody) {
	    
	    // ==========================================================
        // A. 編集モードに切り替えるイベント委譲 (クリック)
        // ==========================================================
        
        // 1. 入出庫状況 (クリック) (省略)
	    busTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-bus-status');
            if (e.target.closest('.js-passengers-field')) return;
	        if (!cell || e.target.closest('button')) return;
	        if (cell.classList.contains('is-editing')) return;
	        
	        const editMode = cell.querySelector('.edit-mode-select');
	        if (!editMode) return;
	        
	        const selectElement = cell.querySelector('.js-bus-situation-select');
	        if (selectElement) {
	            populateBusStatusSelect(selectElement); 
	            const originalStatusId = cell.getAttribute('data-status-id');
	            if (originalStatusId) selectElement.value = originalStatusId;
	        }

	        cell.classList.add('is-editing');

	        const viewMode = cell.querySelector('.view-mode-text');
	        if(viewMode) viewMode.style.display = 'none';
	        if(editMode) editMode.style.display = 'block';

	        if(selectElement) selectElement.focus();
	    });
        
        // 2. 乗車数 (シングルクリック) (省略)
        busTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-passengers-field');
            if (!cell || e.target.closest('button')) return; 
            if (cell.classList.contains('is-editing')) return;
            if (busContent.querySelector('.js-passengers-field.is-editing, .js-bus-status.is-editing')) return;
            
            const passengersText = cell.querySelector('.passengers-text');
            const editForm = cell.querySelector('.passengers-edit-form');
            const input = cell.querySelector('.passengers-input');

            if (!passengersText || !editForm || !input) {
                 console.error("DEBUG ERROR: 乗車数の必須要素が見つかりません。HTMLのクラス名を確認してください。");
                 return; 
            }
            
            let currentValue = passengersText.textContent.replace('名', '').trim();
            if (currentValue === '') {
                currentValue = passengersText.dataset.originalValue || '';
            }
            input.value = currentValue;

            // 🚀 スタイルの調整
            input.style.width = '100%'; 
            input.style.MozAppearance = 'textfield';        
            input.style.WebkitAppearance = 'none';          
            input.style.margin = '0';                       

            cell.classList.add('is-editing');
            
            passengersText.style.display = 'none';
            editForm.style.display = 'block'; 
            editForm.style.visibility = 'visible'; 
            
            // 🚀 スタイルの調整: Flexbox設定
            editForm.style.display = 'flex';           
            editForm.style.flexDirection = 'column';   
            editForm.style.alignItems = 'stretch';     
            editForm.style.gap = '4px';                
            editForm.style.maxWidth = '100%'; 
            editForm.style.boxSizing = 'border-box'; 
            
            input.focus();
            input.select();
        });


	    // ==========================================================
        // B. 「取消」ボタンクリック処理 (イベント委譲) (省略)
        // ==========================================================

	    // 1. 入出庫状況の取消
	    busTableBody.addEventListener('click', (e) => {
	        const cancelButton = e.target.closest('.js-cancel-button-bus');
	        if (!cancelButton) return;

	        const cell = cancelButton.closest('.js-bus-status');
	        
	        const viewMode = cell.querySelector('.view-mode-text');
	        const editMode = cell.querySelector('.edit-mode-select');
	        
	        if (viewMode && editMode) {
	            cell.classList.remove('is-editing');
	            viewMode.style.display = 'inline';
	            editMode.style.display = 'none';
	            
	            const originalStatusId = cell.getAttribute('data-status-id');
	            const selectElement = cell.querySelector('.js-bus-situation-select');
	            if (selectElement && originalStatusId) {
	                selectElement.value = originalStatusId;
	            }
	        }
	    });
        
        // 2. 乗車数の取消
        busTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.js-cancel-passengers-button');
            if (!cancelButton) return;

            const cell = cancelButton.closest('.js-passengers-field');
            const input = cell.querySelector('.passengers-input');
            const passengersText = cell.querySelector('.passengers-text');
            const editForm = cell.querySelector('.passengers-edit-form');
            
            if (cell && cell.classList.contains('is-editing')) {
                // 元の値に戻す (データ属性から)
                input.value = passengersText.dataset.originalValue || ''; 
                
                cell.classList.remove('is-editing');

                // 表示モードに戻す
                passengersText.style.display = 'inline';
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden';
                
                // 💡 スタイルをリセット
                editForm.style.flexDirection = '';
                editForm.style.alignItems = '';
                editForm.style.gap = '';
                editForm.style.maxWidth = ''; 
                editForm.style.boxSizing = ''; 

                input.style.width = ''; 
                input.style.MozAppearance = ''; 
                input.style.WebkitAppearance = ''; 
                input.style.margin = ''; 
            }
        });


	    // ==========================================================
        // C. 「更新」ボタンクリック処理 (API連携) (イベント委譲)
        // ==========================================================

		// 1. 入出庫状況の更新 - 💡 V8.5: ローカル通知を強制実行
        busTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-button-bus');
            if (!updateButton) return;

            const cell = updateButton.closest('.js-bus-status');
            const row = updateButton.closest('tr');
            
            const recordId = getBusRecordId(updateButton); 
            if (!recordId) return; 
            
            const selectElement = cell.querySelector('.js-bus-situation-select');
            
            const fieldName = updateButton.dataset.fieldName; 
            const newValueId = selectElement.value; 

            if (!newValueId || newValueId.trim() === '') {
                 const errorMessage = '入出庫状況を選択してください。';
                 // 💡 V8.5: ローカル通知関数でエラー表示
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            // common.jsのformatDate(new Date())を使用
            if (typeof formatDate === 'undefined') {
                console.error("ERROR: formatDate関数がcommon.jsで見つかりません。");
                const errorMessage = "時刻フォーマット関数が未定義です。common.jsを確認してください。";
                // 💡 V8.5: ローカル通知関数でエラー表示
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                return;
            }
            const currentTime = formatDate(new Date());

            let extraField = null;
            let extraValue = '';
            // 選択されたオプションの表示名を取得
            const newStatusName = selectElement.options[selectElement.selectedIndex].textContent.trim();
            
            if (fieldName === 'busSituation') {
                
                // 🚀 下車出発済の場合、emptybusDepTimeを格納
                if (newStatusName === '下車出発済') {
                    extraField = 'emptybusDepTime';
                    extraValue = currentTime;
                } 
                // 🚀 乗車出発済の場合、departureTimeを格納
                else if (newStatusName === '乗車出発済') {
                    extraField = 'departureTime';
                    extraValue = currentTime;
                }
            }
            
            try {
                // ✅ API呼び出し
                const result = await sendUpdateToServer(
                    '/api/bus/update', 
                    recordId, 
                    fieldName, 
                    newValueId, 
                    extraField, 
                    extraValue,
                    TARGET_TAB_ID 
                );
                
                // --- 成功時の画面表示更新ロジック ---
                const viewMode = cell.querySelector('.view-mode-text');
                const editMode = cell.querySelector('.edit-mode-select');
                
                viewMode.textContent = newStatusName;
                cell.setAttribute('data-status-id', newValueId); 
                
                // 最終更新日時 (12列目) を更新
                const updateTimeCell = row.querySelector('.js-update-time-field'); 
                
                if (updateTimeCell) {
                     updateTimeCell.textContent = result.updateTime || currentTime; 
                }
                
                // 🚀 出庫時刻欄 (5列目/7列目) を更新
                if (fieldName === 'busSituation') {
                    if (newStatusName === '下車出発済') {
                        const emptyBusDepTimeCell = row.querySelector('.js-emptybus-dep-time-field'); 
                        if (emptyBusDepTimeCell) emptyBusDepTimeCell.textContent = currentTime;
                    } 
                    else if (newStatusName === '乗車出発済') {
                        const depTimeCell = row.querySelector('td:nth-child(7)'); 
                        if (depTimeCell) depTimeCell.textContent = currentTime;
                    }
                }
                
                cell.classList.remove('is-editing');
                viewMode.style.display = 'inline'; 
                editMode.style.display = 'none'; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }
                
                // 💡 V8.5: ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 入出庫状況 を ${newStatusName} に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);


            } catch (error) {
                // --- 失敗時のロジック ---
                console.error('API呼び出しエラー:', error);
                
                const errorMessage = `ID: ${recordId} - 更新に失敗しました。詳細: ${error.message}`;
                // 💡 V8.5: ローカル通知関数でエラー表示
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                
                cell.querySelector('.js-cancel-button-bus').click(); 
            }
        });
        
        // 2. 乗車数の更新 - 💡 V8.5: async/await に修正し、ローカル通知を強制実行
        busTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-passengers-button');
            if (!updateButton) return;

            const cell = updateButton.closest('.js-passengers-field');
            const row = updateButton.closest('tr');
            
            const recordId = getBusRecordId(updateButton);
            if (!recordId) return; 

            const passengersText = cell.querySelector('.passengers-text');
            const input = cell.querySelector('.passengers-input');
            const editForm = cell.querySelector('.passengers-edit-form');
            
            const originalValue = passengersText.dataset.originalValue;
            const newValue = input.value.trim();

            if (newValue === originalValue) {
                cell.querySelector('.js-cancel-passengers-button').click();
                return;
            }

            const parsedValue = parseInt(newValue, 10);
            if (isNaN(parsedValue) || newValue === '') {
                const errorMessage = '乗車数には数値を入力してください。';
                // 💡 V8.5: ローカル通知関数でエラー表示
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                return;
            }
            if (parsedValue < 0) {
                 const errorMessage = '乗車数は0以上の値を入力してください。';
                 // 💡 V8.5: ローカル通知関数でエラー表示
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            if (typeof formatDate === 'undefined') {
                 console.error("ERROR: formatDate関数がcommon.jsで見つかりません。");
                 const errorMessage = "時刻フォーマット関数が未定義です。common.jsを確認してください。";
                 // 💡 V8.5: ローカル通知関数でエラー表示
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 cell.querySelector('.js-cancel-passengers-button').click();
                 return;
            }
            const currentTime = formatDate(new Date());

            try {
                // ✅ API呼び出し
                const result = await sendUpdateToServer(
                    '/api/bus/update', 
                    recordId, 
                    'passengers', 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID // Tab IDを明示的に渡す
                );

                // --- 成功時のロジック ---
                const updateTimeCell = row.querySelector('.js-update-time-field');
                        
                passengersText.textContent = parsedValue + '名';
                passengersText.dataset.originalValue = parsedValue; 
                
                if (updateTimeCell) {
                    updateTimeCell.textContent = result.updateTime || currentTime;
                }
                
                // 表示モードに戻す
                cell.classList.remove('is-editing');
                passengersText.style.display = 'inline';
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden'; 
                
                // 💡 スタイルをリセット
                editForm.style.flexDirection = '';
                editForm.style.alignItems = '';
                editForm.style.gap = '';
                editForm.style.maxWidth = ''; 
                editForm.style.boxSizing = ''; 

                input.style.width = ''; 
                input.style.MozAppearance = ''; 
                input.style.WebkitAppearance = ''; 
                input.style.margin = ''; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }

                // 💡 V8.5: ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 乗車数 を ${parsedValue}名 に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                // 失敗時のロジック
                const errorMessage = `ID: ${recordId} - 乗車人数の更新に失敗しました: ${error.message || '不明なエラー'}`;
                // 💡 V8.5: ローカル通知関数でエラー表示
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                console.error('Update error:', error);
                cell.querySelector('.js-cancel-passengers-button').click();
            }
        });


	} // busTableBody の if の閉じ

}); // DOMContentLoaded の閉じ