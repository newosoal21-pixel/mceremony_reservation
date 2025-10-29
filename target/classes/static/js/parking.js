/**
 * parking.js
 * * 駐車場予約リスト (#content1) の機能とロジック
 * * 依存: common.js (sendUpdateToServer, formatDate, showNotificationToast, showNotification, highlightCellAndId)
 * * 修正 V8.4:
 * * 1. 機能が復旧した V7.7 をベースに、ローカル通知関数 (updateOperationResultField) を追加。
 * * 2. 備考欄を含む全ての更新成功時、ローカル通知関数を強制的に呼び出し、通知が表示されない問題を解決する。
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: parking.js の実行が開始されました。"); 
    
    const parkingContent = document.getElementById('content1');
    if (!parkingContent) return; 

    // 💡 ターゲットタブIDを定義
    const TARGET_TAB_ID = 'tab1';
    const CONTENT_SELECTOR = '#content1'; // ローカル通知用に追加
    
    // ------------------------------------------------------------------
    // 💡 ID取得ヘルパー関数 (V7 追加)
    // ------------------------------------------------------------------
    /**
     * 親の<tr>からレコードIDを抽出するユーティリティ関数 (V7修正)
     * @param {HTMLElement} element - クリックされた要素
     * @returns {string|null} レコードID
     */
    function getParkingRecordId(element) {
        const row = element.closest('tr');
        // 💡 修正点: <tr>から data-parking-id 属性を取得する
        const recordId = row ? row.getAttribute('data-parking-id') : null;
        if (!recordId) {
            console.error("エラー: 駐車場レコードID (data-parking-id) が見つかりません。");
        }
        return recordId;
    }


	// ------------------------------------------------------------------
	// 💡 ローカル通知関数 (V8.4: 追加)
	// ------------------------------------------------------------------
    const RESULT_FIELD_IDS = {
        '#content1': "last-operation-result-tab1"
    };

    /**
     * 更新結果を固定表示欄とトーストで表示する
     * @param {string} contentSelector - タブのセレクタ ('#content1')
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
             // 失敗時のみ共通の showNotification にフォールバック (元々の挙動)
             if (typeof showNotification === 'function' && !success) {
                 showNotification(message, 'error', TARGET_TAB_ID);
             }
         }
    }


	// ==========================================================
	// 1. データストア: 取得した状況データを保持する変数
	// ==========================================================
	let parkingStatusesData = []; 
    const parkingTableBody = document.querySelector('#content1 .excel-table tbody'); 

	// ==========================================================
	// 2. データの取得: ページロード時にAPIから状況リストを取得する関数
	// ==========================================================
	async function fetchParkingStatuses() {
	    console.log("DEBUG: fetchParkingStatuses関数が実行されました。APIを呼び出します。");
	    try {
	        const response = await fetch('/api/parking/statuses'); 
            
	        if (!response.ok) {
	            throw new Error(`HTTP error! status: ${response.status}`);
	        }
	        parkingStatusesData = await response.json();
	        console.log("DEBUG: ParkingStatuses data loaded:", parkingStatusesData);
	    } catch (error) {
	        console.error("DEBUG: Failed to fetch parking statuses:", error);
            const errorMessage = '利用状況の選択肢データをロードできませんでした。';
            // 💡 エラー時は updateOperationResultField を使用して表示
            updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
	    }
	}
    
	fetchParkingStatuses();

	// ==========================================================
	// 3. セレクタの描画: 編集モードが開かれたときに実行する関数
	// ==========================================================

	/**
	 * 利用状況セレクタ (<select>) に <option> タグを生成して挿入する
	 * @param {HTMLElement} selectElement - <select class="situation-select"> 要素
	 */
	function populateParkingStatusSelect(selectElement) {
	    selectElement.innerHTML = ''; 

	    const defaultOption = document.createElement('option');
	    defaultOption.value = '';
	    defaultOption.textContent = '選択してください';
	    selectElement.appendChild(defaultOption);
        
        // 💡 修正適用: parkingStatusesData を statusId に基づいて昇順ソートする
        // statusIdが数値であることを前提とします
        const sortedStatuses = parkingStatusesData.slice().sort((a, b) => {
            return Number(a.statusId) - Number(b.statusId);
        });

	    sortedStatuses.forEach(status => {
	        const option = document.createElement('option');
	        option.value = status.statusId;      
	        option.textContent = status.statusName; 
	        selectElement.appendChild(option);
	    });
	}
    
    /**
	 * 駐車位置/駐車証No. セレクタ (<select>) に 1～24 の <option> タグを生成して挿入する
	 * @param {HTMLElement} selectElement - <select class="permit-number-select" or "permit-location-select"> 要素
	 */
	function populateFixedOptionSelect(selectElement) {
	    selectElement.innerHTML = ''; 

	    // 💡 初期値（空欄）のオプションを追加
	    const defaultOption = document.createElement('option');
	    defaultOption.value = '';
	    defaultOption.textContent = '選択してください';
	    selectElement.appendChild(defaultOption);

	    // 💡 1から24までのオプションを生成
	    for (let i = 1; i <= 24; i++) {
	        const option = document.createElement('option');
	        // 値と表示テキストは i の数値を使用
	        const valueText = String(i).padStart(2, '0'); // 01, 02, ... 24
	        option.value = valueText;      
	        option.textContent = valueText; 
	        selectElement.appendChild(option);
	    }
	}


	// ------------------------------------------------------------------
	// --- 5. 駐車場予約リスト (content1) の処理 ---
	// ------------------------------------------------------------------

	if (parkingTableBody) {
	    
	    // ==========================================================
        // A. 編集モードに切り替えるイベント委譲 (クリック)
        // ==========================================================
        
        // 1. 利用状況 (クリック)
	    parkingTableBody.addEventListener('click', (e) => {
	        const cell = e.target.closest('.js-parking-status');
	        
            // 車両ナンバー、備考欄などをクリックした場合は利用状況の処理をしない
	        if (e.target.closest('.js-vehicle-number-field') || e.target.closest('.js-remarks-field')) return;
	        if (!cell || e.target.closest('button')) return;
	        if (cell.classList.contains('is-editing')) return;
	        
	        const editMode = cell.querySelector('.edit-mode-select');
	        if (!editMode) return;
	        
	        const selectElement = cell.querySelector('.situation-select');
	        if (selectElement) {
	            populateParkingStatusSelect(selectElement); 
	            const originalStatusId = cell.getAttribute('data-status-id');
	            if (originalStatusId) selectElement.value = originalStatusId;
	        }

	        cell.classList.add('is-editing');

	        const viewMode = cell.querySelector('.view-mode-text');
	        if(viewMode) viewMode.style.display = 'none';
	        if(editMode) editMode.style.display = 'block';

	        if(selectElement) selectElement.focus();
	    });
        
        // 2. 車両ナンバー (シングルクリック)
        parkingTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-vehicle-number-field');

            if (!cell || e.target.closest('button')) return; 
            if (cell.classList.contains('is-editing')) return;
            
            const vehicleNumberText = cell.querySelector('.vehicle-number-text');
            const editForm = cell.querySelector('.vehicle-number-edit-form');
            const input = cell.querySelector('.vehicle-number-input');

            if (!vehicleNumberText || !editForm || !input) {
                 console.error("DEBUG ERROR: 車両ナンバーの必須要素が見つかりません。");
                 return; 
            }
            
            let currentValue = vehicleNumberText.textContent.trim();
            if (currentValue === '') {
                currentValue = vehicleNumberText.dataset.originalValue || '';
            }
            input.value = currentValue;

            cell.classList.add('is-editing');
            
            vehicleNumberText.style.display = 'none';
            editForm.style.display = 'flex'; 
            editForm.style.visibility = 'visible'; 
            
            input.focus();
            input.select();
        });
        
        // 3. 備考欄 (シングルクリック)
        parkingTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-remarks-field');

            if (!cell || e.target.closest('button')) return; 
            if (cell.classList.contains('is-editing')) return;
            
            const remarksText = cell.querySelector('.remarks-text');
            const editForm = cell.querySelector('.remarks-edit-form');
            const textarea = cell.querySelector('.remarks-textarea');

            if (!remarksText || !editForm || !textarea) {
                 console.error("DEBUG ERROR: 備考欄の必須要素が見つかりません。");
                 return; 
            }
            
            let currentValue = remarksText.textContent.trim();
            textarea.value = currentValue;

            cell.classList.add('is-editing');
            
            remarksText.style.display = 'none';
            editForm.style.display = 'block'; 
            editForm.style.visibility = 'visible'; 
            
            textarea.focus();
        });

        // 4. 駐車位置 (セレクタ方式)
        parkingTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-permit-location');
            
            // 他の編集可能なフィールドやボタンをクリックした場合は処理をスキップ
            if (e.target.closest('.js-parking-status') || e.target.closest('.js-vehicle-number-field') || e.target.closest('.js-remarks-field') || e.target.closest('.js-permit-number')) return;
            if (!cell || e.target.closest('button')) return;
            if (cell.classList.contains('is-editing')) return;
            
            const editMode = cell.querySelector('.edit-mode-select');
            if (!editMode) return;
            
            const selectElement = cell.querySelector('.permit-location-select'); 
            if (selectElement) {
                // 💡 固定値オプションを描画
                populateFixedOptionSelect(selectElement); 
                
                const originalLocationValue = cell.getAttribute('data-value'); 
                if (originalLocationValue) selectElement.value = originalLocationValue;
            }

            cell.classList.add('is-editing');

            const viewMode = cell.querySelector('.view-mode-text');
            if(viewMode) viewMode.style.display = 'none';
            if(editMode) editMode.style.display = 'block';

            if(selectElement) selectElement.focus();
        });

        // 5. 駐車証No. (セレクタ方式)
        parkingTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-permit-number');
            
            // 他の編集可能なフィールドやボタンをクリックした場合は処理をスキップ
            if (e.target.closest('.js-parking-status') || e.target.closest('.js-vehicle-number-field') || e.target.closest('.js-remarks-field') || e.target.closest('.js-permit-location')) return;
            if (!cell || e.target.closest('button')) return;
            if (cell.classList.contains('is-editing')) return;
            
            const editMode = cell.querySelector('.edit-mode-select');
            if (!editMode) return;
            
            const selectElement = cell.querySelector('.permit-number-select'); 
            if (selectElement) {
                // 💡 固定値オプションを描画
                populateFixedOptionSelect(selectElement); 
                
                const originalNumberValue = cell.getAttribute('data-value'); 
                if (originalNumberValue) selectElement.value = originalNumberValue;
            }

            cell.classList.add('is-editing');

            const viewMode = cell.querySelector('.view-mode-text');
            if(viewMode) viewMode.style.display = 'none';
            if(editMode) editMode.style.display = 'block';

            if(selectElement) selectElement.focus();
        });


	    // ==========================================================
        // B. 「取消」ボタンクリック処理 (イベント委譲)
        // ==========================================================

	    // 1. 利用状況の取消
	    parkingTableBody.addEventListener('click', (e) => {
	        const cancelButton = e.target.closest('.js-cancel-button');
	        if (!cancelButton || cancelButton.closest('.js-permit-number') || cancelButton.closest('.js-permit-location')) return; // 駐車位置/駐車証No.と重複回避

	        const cell = cancelButton.closest('.js-parking-status');
	        
	        const viewMode = cell.querySelector('.view-mode-text');
	        const editMode = cell.querySelector('.edit-mode-select');
	        
	        if (viewMode && editMode) {
	            cell.classList.remove('is-editing');
	            
	            viewMode.style.display = 'inline';
	            editMode.style.display = 'none';
	            
	            const originalStatusId = cell.getAttribute('data-status-id');
	            const selectElement = cell.querySelector('.situation-select');
	            if (selectElement && originalStatusId) {
	                selectElement.value = originalStatusId;
	            }
	        }
	    });
        
        // 2. 車両ナンバーの取消
        parkingTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.js-cancel-vehicle-button');
            if (!cancelButton) return;

            const cell = cancelButton.closest('.js-vehicle-number-field');
            const input = cell.querySelector('.vehicle-number-input');
            const vehicleNumberText = cell.querySelector('.vehicle-number-text');
            const editForm = cell.querySelector('.vehicle-number-edit-form');
            
            if (cell && cell.classList.contains('is-editing')) {
                const originalValue = vehicleNumberText.dataset.originalValue || ''; 
                input.value = originalValue; 
                
                cell.classList.remove('is-editing');
                vehicleNumberText.style.display = 'inline';
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden';
            }
        });
        
        // 3. 備考欄の取消
        parkingTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.cancel-remarks-button');
            if (!cancelButton) return;

            const cell = cancelButton.closest('.js-remarks-field');
            const textarea = cell.querySelector('.remarks-textarea');
            const remarksText = cell.querySelector('.remarks-text');
            const editForm = cell.querySelector('.remarks-edit-form');
            
            if (cell && cell.classList.contains('is-editing')) {
                const originalValue = textarea.dataset.originalValue || ''; 
                textarea.value = originalValue; 
                
                cell.classList.remove('is-editing');
                remarksText.style.display = 'inline';
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden';
            }
        });

        // 4. 駐車位置の取消
        parkingTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.js-cancel-button'); 
            if (!cancelButton) return;
            const cell = cancelButton.closest('.js-permit-location');
            if (!cell) return; // 駐車位置のセルでなければスキップ
            
            const viewMode = cell.querySelector('.view-mode-text');
            const editMode = cell.querySelector('.edit-mode-select');
            
            if (viewMode && editMode) {
                cell.classList.remove('is-editing');
                
                viewMode.style.display = 'inline';
                editMode.style.display = 'none';
                
                const originalLocationValue = cell.getAttribute('data-value');
                const selectElement = cell.querySelector('.permit-location-select');
                if (selectElement && originalLocationValue) {
                    selectElement.value = originalLocationValue;
                }
            }
        });

        // 5. 駐車証No.の取消
        parkingTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.js-cancel-button'); 
            if (!cancelButton) return;
            const cell = cancelButton.closest('.js-permit-number');
            if (!cell) return; // 駐車証No.のセルでなければスキップ
            
            const viewMode = cell.querySelector('.view-mode-text');
            const editMode = cell.querySelector('.edit-mode-select');
            
            if (viewMode && editMode) {
                cell.classList.remove('is-editing');
                
                viewMode.style.display = 'inline';
                editMode.style.display = 'none';
                
                const originalNumberValue = cell.getAttribute('data-value');
                const selectElement = cell.querySelector('.permit-number-select');
                if (selectElement && originalNumberValue) {
                    selectElement.value = originalNumberValue;
                }
            }
        });


	    // ==========================================================
        // C. 「更新」ボタンクリック処理 (API連携) (イベント委譲)
        // ==========================================================

		// 1. 利用状況の更新 - 💡 V8.4: ローカル通知を強制実行
        parkingTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-button');
             // 💡 駐車位置/駐車証No.の更新ボタンとの重複回避
            if (!updateButton || updateButton.closest('.js-permit-number') || updateButton.closest('.js-permit-location')) return; 

            const cell = updateButton.closest('.js-parking-status');
            const row = updateButton.closest('tr');
            
            const recordId = getParkingRecordId(updateButton);
            if (!recordId) return; 

            const selectElement = cell.querySelector('.situation-select');
            
            const fieldName = updateButton.dataset.fieldName; 
            const newValueId = selectElement.value; 

            if (!newValueId || newValueId.trim() === '') {
                 const errorMessage = '利用状況を選択してください。';
                 // 💡 V8.4: エラー時もローカル通知を使用
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            if (typeof formatDate === 'undefined') {
                console.error("ERROR: formatDate関数がcommon.jsで見つかりません。");
                return;
            }
            const currentTime = formatDate(new Date());

            let extraField = null;
            let extraValue = '';
            // 選択されたオプションの表示名を取得
            const newStatusName = selectElement.options[selectElement.selectedIndex].textContent.trim();
            
            if (fieldName === 'parkingStatus') {
                // 🚀 出庫済の場合、departureTimeを格納
                if (newStatusName === '出庫済') {
                    extraField = 'departureTime';
                    extraValue = currentTime;
                } 
            }
            
            try {
                const result = await sendUpdateToServer(
                    '/api/parking/update', 
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
                
                // 🚀 出庫時刻欄 (8列目) を更新
                if (fieldName === 'parkingStatus' && newStatusName === '出庫済') {
                    const departureTimeCell = row.querySelector('.js-exit-time-field'); 
                    if (departureTimeCell) departureTimeCell.textContent = currentTime;
                }
                
                cell.classList.remove('is-editing');
                viewMode.style.display = 'inline'; 
                editMode.style.display = 'none'; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }
                
                // 💡 V8.4: ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 利用状況 を ${newStatusName} に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                console.error('利用状況の更新エラー:', error);
                
                const errorMessage = `ID: ${recordId} - 更新に失敗しました。詳細: ${error.message}`;
                // 💡 V8.4: エラー時もローカル通知を使用
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);

                cell.querySelector('.js-cancel-button').click(); // 💡 エラー時はUIを閉じる
            }
        });
        
        // 2. 車両ナンバーの更新 - 💡 V8.4: ローカル通知を強制実行
        parkingTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-vehicle-button');
            if (!updateButton) return;

            const cell = updateButton.closest('.js-vehicle-number-field');
            const row = updateButton.closest('tr');
            
            const recordId = getParkingRecordId(updateButton);
            if (!recordId) return; 

            const vehicleNumberText = cell.querySelector('.vehicle-number-text');
            const input = cell.querySelector('.vehicle-number-input');
            const editForm = cell.querySelector('.vehicle-number-edit-form');
            
            const originalValue = vehicleNumberText.dataset.originalValue;
            const newValue = input.value.trim();

            if (newValue === originalValue) {
                cell.querySelector('.js-cancel-vehicle-button').click();
                return;
            }

            if (typeof formatDate === 'undefined') return;
            const currentTime = formatDate(new Date());

            try {
                const result = await sendUpdateToServer(
                    '/api/parking/update', 
                    recordId, 
                    'carNumber', 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID 
                );
                    
                vehicleNumberText.textContent = newValue;
                vehicleNumberText.dataset.originalValue = newValue; 
                input.value = newValue; 
                
                const updateTimeCell = row.querySelector('.js-update-time-field');
                if (updateTimeCell) {
                    updateTimeCell.textContent = result.updateTime || currentTime;
                }
                
                cell.classList.remove('is-editing');
                vehicleNumberText.style.display = 'inline';
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden'; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }
                
                // 💡 V8.4: ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 車両ナンバー を ${newValue} に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                console.error('車両ナンバーの更新エラー:', error);
                const errorMessage = `ID: ${recordId} - 車両ナンバーの更新に失敗しました: ${error.message}`;
                // 💡 V8.4: エラー時もローカル通知を使用
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);

                cell.querySelector('.js-cancel-vehicle-button').click();
            }
        });
        
        // 3. 備考欄の更新 - 💡 V8.4: ローカル通知を強制実行
        parkingTableBody.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target.closest('.remarks-edit-form');
            if (!form) return;

            const cell = form.closest('.js-remarks-field');
            const row = form.closest('tr');
            
            const recordId = getParkingRecordId(form);
            if (!recordId) return; 

            const remarksText = cell.querySelector('.remarks-text');
            const textarea = cell.querySelector('.remarks-textarea');
            const editForm = cell.querySelector('.remarks-edit-form');
            
            const originalValue = textarea.dataset.originalValue;
            const newValue = textarea.value.trim();

            if (newValue === originalValue) {
                cell.querySelector('.cancel-remarks-button').click();
                return;
            }

            if (typeof formatDate === 'undefined') return;
            const currentTime = formatDate(new Date());
            
            try {
                const result = await sendUpdateToServer(
                    '/api/parking/update', 
                    recordId, 
                    'remarksColumn', 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID 
                );
                
                remarksText.textContent = newValue;
                textarea.dataset.originalValue = newValue; 
                textarea.value = newValue; 
                
                const updateTimeCell = row.querySelector('.js-update-time-field');
                if (updateTimeCell) {
                    updateTimeCell.textContent = result.updateTime || currentTime;
                }
                
                cell.classList.remove('is-editing');
                remarksText.style.display = 'inline';
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden'; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }
                
                // 💡 V8.4: ローカル通知関数でメッセージを強制表示 (備考欄も統一)
                const successMessage = `ID: ${recordId} の 備考欄 を更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                console.error('備考欄の更新エラー:', error);
                const errorMessage = `ID: ${recordId} - 備考欄の更新に失敗しました: ${error.message}`;
                // 💡 V8.4: エラー時もローカル通知を使用
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);

                cell.querySelector('.cancel-remarks-button').click();
            }
        });

        // 4. 駐車位置の更新 - 💡 V8.4: ローカル通知を強制実行
        parkingTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-button'); 
            if (!updateButton || !updateButton.closest('.js-permit-location')) return;

            const cell = updateButton.closest('.js-permit-location');
            const row = updateButton.closest('tr');
            
            const recordId = getParkingRecordId(updateButton);
            if (!recordId) return; 

            const selectElement = cell.querySelector('.permit-location-select');
            const fieldName = 'parkingPosition'; 
            const newValue = selectElement.value; 
            const newText = selectElement.options[selectElement.selectedIndex].textContent.trim();

            if (!newValue || newValue.trim() === '') {
                 const errorMessage = '駐車位置を選択してください。';
                 // 💡 V8.4: エラー時もローカル通知を使用
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            try {
                const result = await sendUpdateToServer(
                    '/api/parking/update', 
                    recordId, 
                    fieldName, 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID 
                );
                
                // --- 成功時の画面表示更新ロジック ---
                const viewMode = cell.querySelector('.view-mode-text');
                const editMode = cell.querySelector('.edit-mode-select');
                
                viewMode.textContent = newText;
                cell.setAttribute('data-value', newValue); 
                
                const updateTimeCell = row.querySelector('.js-update-time-field'); 
                if (updateTimeCell) {
                     updateTimeCell.textContent = result.updateTime || formatDate(new Date()); 
                }
                
                cell.classList.remove('is-editing');
                viewMode.style.display = 'inline'; 
                editMode.style.display = 'none'; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }
                
                // 💡 V8.4: ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 駐車位置 を ${newText} に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                console.error('駐車位置の更新エラー:', error);
                const errorMessage = `ID: ${recordId} - 更新に失敗しました。詳細: ${error.message}`;
                // 💡 V8.4: エラー時もローカル通知を使用
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);

                cell.querySelector('.js-cancel-button').click(); // 💡 エラー時はUIを閉じる
            }
        });

        // 5. 駐車証No.の更新 - 💡 V8.4: ローカル通知を強制実行
        parkingTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-button'); 
            if (!updateButton || !updateButton.closest('.js-permit-number')) return;

            const cell = updateButton.closest('.js-permit-number');
            const row = updateButton.closest('tr');
            
            const recordId = getParkingRecordId(updateButton);
            if (!recordId) return; 

            const selectElement = cell.querySelector('.permit-number-select');
            const fieldName = 'parkingPermit'; 
            const newValue = selectElement.value; 
            const newText = selectElement.options[selectElement.selectedIndex].textContent.trim();

            if (!newValue || newValue.trim() === '') {
                 const errorMessage = '駐車証No.を選択してください。';
                 // 💡 V8.4: エラー時もローカル通知を使用
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            try {
                const result = await sendUpdateToServer(
                    '/api/parking/update', 
                    recordId, 
                    fieldName, 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID 
                );
                
                // --- 成功時の画面表示更新ロジック ---
                const viewMode = cell.querySelector('.view-mode-text');
                const editMode = cell.querySelector('.edit-mode-select');
                
                viewMode.textContent = newText;
                cell.setAttribute('data-value', newValue); 
                
                const updateTimeCell = row.querySelector('.js-update-time-field'); 
                if (updateTimeCell) {
                     updateTimeCell.textContent = result.updateTime || formatDate(new Date()); 
                }
                
                cell.classList.remove('is-editing');
                viewMode.style.display = 'inline'; 
                editMode.style.display = 'none'; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }
                
                // 💡 V8.4: ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 駐車証No. を ${newText} に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                console.error('駐車証No.の更新エラー:', error);
                const errorMessage = `ID: ${recordId} - 更新に失敗しました。詳細: ${error.message}`;
                // 💡 V8.4: エラー時もローカル通知を使用
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);

                cell.querySelector('.js-cancel-button').click(); // 💡 エラー時はUIを閉じる
            }
        });


	} // parkingTableBody の if の閉じ
    
    // ==========================================================
    // D. リモート更新後のDOM操作関数 (common.jsのhandleRemoteUpdateから呼び出される)
    // ==========================================================
    
    /**
     * リモート更新メッセージに基づき、指定された駐車場レコードのDOMを更新する。
     * @param {string} id - 更新されたレコードのID
     * @param {string} fieldName - 更新されたフィールド名
     * @param {string} newValue - 新しい値
     * @param {string} [extraField] - 同時に更新された追加フィールド名
     * @param {string} [extraValue] - 追加フィールドの値
     * @param {string} updateTime - 更新時刻
     */
    window.updateParkingRow = function(id, fieldName, newValue, extraField, extraValue, updateTime) {
        console.log(`DEBUG: updateParkingRow called for ID ${id}, Field: ${fieldName}`);
        
        // IDが一致する行を検索
        const row = document.querySelector(`#content1 tr[data-parking-id="${id}"]`);
        if (!row) {
            console.warn(`WARN: Parking row with ID ${id} not found for remote update.`);
            return;
        }

        // 最終更新日時を更新
        const updateTimeCell = row.querySelector('.js-update-time-field');
        if (updateTimeCell) {
            updateTimeCell.textContent = updateTime;
        }

        let targetCell;
        
        switch (fieldName) {
            case 'parkingStatus':
                targetCell = row.querySelector('.js-parking-status');
                if (targetCell) {
                    targetCell.setAttribute('data-status-id', newValue);
                    
                    // ステータス名を取得 (これはローカルデータから取得する必要がある)
                    const status = parkingStatusesData.find(s => String(s.statusId) === String(newValue));
                    if (status) {
                        const viewMode = targetCell.querySelector('.view-mode-text');
                        if (viewMode) viewMode.textContent = status.statusName;
                    }

                    // extraField (departureTime) の更新も処理
                    if (extraField === 'departureTime' && extraValue) {
                        const exitTimeCell = row.querySelector('.js-exit-time-field');
                        if (exitTimeCell) exitTimeCell.textContent = extraValue;
                    }
                }
                break;
                
            case 'carNumber':
                targetCell = row.querySelector('.js-vehicle-number-field');
                if (targetCell) {
                    const viewText = targetCell.querySelector('.vehicle-number-text');
                    const input = targetCell.querySelector('.vehicle-number-input');
                    if (viewText) viewText.textContent = newValue;
                    if (input) input.value = newValue; 
                    if (viewText) viewText.dataset.originalValue = newValue;
                }
                break;

            case 'remarksColumn':
                targetCell = row.querySelector('.js-remarks-field');
                if (targetCell) {
                    const viewText = targetCell.querySelector('.remarks-text');
                    const textarea = targetCell.querySelector('.remarks-textarea');
                    if (viewText) viewText.textContent = newValue;
                    if (textarea) textarea.value = newValue;
                    if (textarea) textarea.dataset.originalValue = newValue;
                }
                break;
                
            case 'parkingPermit':
                targetCell = row.querySelector('.js-permit-number');
                if (targetCell) {
                    const viewMode = targetCell.querySelector('.view-mode-text');
                    if (viewMode) viewMode.textContent = newValue; 
                    targetCell.setAttribute('data-value', newValue);
                }
                break;

            case 'parkingPosition':
                targetCell = row.querySelector('.js-permit-location');
                if (targetCell) {
                    const viewMode = targetCell.querySelector('.view-mode-text');
                    if (viewMode) viewMode.textContent = newValue; 
                    targetCell.setAttribute('data-value', newValue);
                }
                break;

            default:
                console.warn(`WARN: Remote update field ${fieldName} not handled in parking.js.`);
                return; 
        }

        // 更新されたセルとIDをハイライト
        if (targetCell && typeof highlightCellAndId === 'function') {
            highlightCellAndId(targetCell);
        }
    };


});