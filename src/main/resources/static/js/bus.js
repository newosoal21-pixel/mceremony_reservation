/**
 * bus.js
 * * 送迎バス運行リスト (#content3) の機能とロジック
 * * 修正 V9.4 (最終統合版):
 * * 1. 乗車数（js-passengers-field）の編集モードの表示・位置制御を、JavaScriptによるスタイル強制にて実装。
 * * 2. 備考欄を含む全フィールドに対し、common.js と連携するリアルタイム更新関数 window.updateBusRow を定義。
 * * 3. 備考欄の表示要素を .remarks-text に修正し、リモート更新を可能にした。
 */

// 💡 TARGET_TAB_ID と CONTENT_SELECTOR はグローバルまたはDOMContentLoaded外で定義し、
// window.updateBusRow からも参照できるようにする (この例では関数内で再定義しています)
const TARGET_TAB_ID = 'tab3';
const CONTENT_SELECTOR = '#content3';

// busSituationsData は window.updateBusRow で使用されるため、グローバルスコープで定義
let busSituationsData = []; 


document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: bus.js の実行が開始されました。"); 
    
    const busContent = document.getElementById(CONTENT_SELECTOR.substring(1));
    if (!busContent) return; // タブ3がない場合は終了
    
    // ------------------------------------------------------------------
    // 💡 ID取得ヘルパー関数
    // ------------------------------------------------------------------
    function getBusRecordId(element) {
        const row = element.closest('tr');
        const recordId = row ? row.getAttribute('data-bus-id') : null; 
        if (!recordId) {
            console.error("エラー: 送迎バスレコードID (data-bus-id) が見つかりません。");
        }
        return recordId;
    }


	// ------------------------------------------------------------------
	// 💡 ローカル通知関数 (common.jsの関数を強制実行)
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

         // common.js の showNotificationToast を使ってトースト表示を強制実行
         if (typeof showNotificationToast === 'function') {
             showNotificationToast(message, success ? 'success' : 'error');
         } else {
             console.warn("common.js の showNotificationToast 関数が見つかりません。");
             if (typeof showNotification === 'function' && !success) {
                 showNotification(message, 'error', TARGET_TAB_ID);
             }
         }
    }


	// ==========================================================
	// 1. データストアと初期化
	// ==========================================================
    // busSituationsData はファイル冒頭で定義済み
    const busTableBody = document.querySelector('#content3 .excel-table tbody'); 

	// ==========================================================
	// 2. データの取得: ページロード時にAPIから状況リストを取得する関数
	// ==========================================================
	async function fetchBusSituations() {
	    console.log("DEBUG: fetchBusSituations関数が実行されました。APIを呼び出します。");
	    try {
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
	        // グローバルスコープの変数に代入
	        busSituationsData = await response.json(); 
	        console.log("DEBUG: BusSituations data loaded:", busSituationsData);
	    } catch (error) {
	        console.error("DEBUG: Failed to fetch bus situations:", error);
	        
            const errorMessage = '入出庫状況の選択肢データをロードできませんでした。';
            updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
	    }
	}
    
	fetchBusSituations();

	// ==========================================================
	// 3. セレクタの描画: 編集モードが開かれたときに実行する関数
	// ==========================================================

	/**
	 * 入出庫状況セレクタ (<select>) に <option> タグを生成して挿入する
	 * @param {HTMLElement} selectElement - <select class="js-bus-situation-select"> 要素
	 */
	function populateBusStatusSelect(selectElement) {
	    selectElement.innerHTML = ''; 
	    const defaultOption = document.createElement('option');
	    defaultOption.value = '';
	    defaultOption.textContent = '選択してください';
	    selectElement.appendChild(defaultOption);

	    busSituationsData.forEach(situation => {
	        const option = document.createElement('option');
	        option.value = situation.id;      
	        option.textContent = situation.name; 
	        selectElement.appendChild(option);
	    });
	}

    /**
	 * 乗車人数セレクタ (<select>) に 0～50 の <option> タグを生成して挿入する
	 * @param {HTMLElement} selectElement - <select class="riders-select"> 要素
	 */
	function populateRidersSelect(selectElement) {
	    selectElement.innerHTML = ''; 

	    // 0から50までのオプションを生成
	    for (let i = 0; i <= 50; i++) {
	        const option = document.createElement('option');
	        const valueText = String(i);
	        option.value = valueText;      
	        option.textContent = valueText; 
	        selectElement.appendChild(option);
	    }
	}
    
    
	// ------------------------------------------------------------------
	// --- 5. 送迎バス運行リスト (content3) の処理 ---
	// ------------------------------------------------------------------

	if (busTableBody) {
	    
	    // ==========================================================
        // A. 編集モードに切り替えるイベント委譲 (クリック)
        // ==========================================================
        
        // 1. 入出庫状況 (クリック) - CSSに表示制御を委ねる 
	    busTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-bus-status');
            // 乗車数のクリックと競合しないようにする
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
            
	        if(selectElement) selectElement.focus();
	    });
        
        // 2. 乗車数 (セレクタ方式) - スタイルをJSで強制的に付与し、意図した位置に表示させる
        busTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-passengers-field');
            if (!cell || e.target.closest('button')) return; 
            if (cell.classList.contains('is-editing')) return;
            
            const viewMode = cell.querySelector('.passengers-text');
            const editMode = cell.querySelector('.edit-mode-select'); 
            const selectElement = cell.querySelector('.riders-select'); 
            
            if (!viewMode || !editMode || !selectElement) {
                 console.error("DEBUG ERROR: 乗車数の必須要素(View/Edit/Select)が見つかりません。HTMLのクラス名を確認してください。");
                 return; 
            }
            
            if (selectElement) {
                populateRidersSelect(selectElement); 
                
                let originalRidersValue = cell.querySelector('.passengers-text').dataset.originalValue;
                if (!originalRidersValue) {
                    originalRidersValue = cell.querySelector('.passengers-text').textContent.replace('名', '').trim();
                }
                if (originalRidersValue) selectElement.value = originalRidersValue;
            }

            cell.classList.add('is-editing');
            
            viewMode.style.display = 'none';

            // JSで編集フィールドの表示と位置を強制制御する (PC表示での位置ずれ対策)
            editMode.style.display = 'flex';
            editMode.style.flexDirection = 'column'; 
            
            editMode.style.position = 'absolute';
            editMode.style.top = '100%';
            editMode.style.left = '0';
            editMode.style.zIndex = '10';
            editMode.style.width = 'auto'; 
            editMode.style.whiteSpace = 'nowrap'; 
            editMode.style.backgroundColor = '#f8f9fa'; 
            editMode.style.border = '1px solid #ccc';
            editMode.style.padding = '5px';
            
            selectElement.focus();
        });
        
        // 3. 備考欄 (テキストエリア方式) 編集モード切り替え
        busTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-remarks-field');
            // 乗車数や他の編集モードと競合しないようにする
            if (!cell || e.target.closest('button') || e.target.closest('.js-passengers-field')) return;
            if (cell.classList.contains('is-editing')) return;

            const viewMode = cell.querySelector('.remarks-text');
            const editForm = cell.querySelector('.remarks-edit-form');
            const textarea = cell.querySelector('.remarks-textarea');
            
            if (!viewMode || !editForm || !textarea) return;

            // フォームの表示
            editForm.style.display = 'block';
            editForm.style.visibility = 'visible';
            viewMode.style.display = 'none'; 
            
            cell.classList.add('is-editing');
            textarea.focus();
        });


	    // ==========================================================
        // B. 「取消」ボタンクリック処理 (イベント委譲)
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
	            
	            const originalStatusId = cell.getAttribute('data-status-id');
	            const selectElement = cell.querySelector('.js-bus-situation-select');
	            if (selectElement && originalStatusId) {
	                selectElement.value = originalStatusId;
	            }
	        }
	    });
        
        // 2. 乗車数の取消 (JSで表示を確実に非表示にする)
        busTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.js-cancel-passengers-button');
            if (!cancelButton) return;

            const cell = cancelButton.closest('.js-passengers-field');
            const selectElement = cell.querySelector('.riders-select');
            const passengersText = cell.querySelector('.passengers-text');
            const editMode = cell.querySelector('.edit-mode-select'); 
            
            if (cell && cell.classList.contains('is-editing')) {
                const originalValue = passengersText.dataset.originalValue || passengersText.textContent.replace('名', '').trim();
                if (selectElement) selectElement.value = originalValue; 
                
                cell.classList.remove('is-editing');

                passengersText.style.display = 'inline';
                editMode.style.display = 'none'; 
            }
        });
        
        // 3. 備考欄の取消
        busTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.cancel-remarks-button');
            if (!cancelButton) return;

            const cell = cancelButton.closest('.js-remarks-field');
            const viewMode = cell.querySelector('.remarks-text');
            const editForm = cell.querySelector('.remarks-edit-form');
            const textarea = cell.querySelector('.remarks-textarea');
            
            if (cell && cell.classList.contains('is-editing')) {
                
                // 元の値に戻す
                const originalValue = textarea.dataset.originalValue;
                textarea.value = originalValue; 
                textarea.textContent = originalValue;

                cell.classList.remove('is-editing');
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden';
                viewMode.style.display = 'inline';
            }
        });


	    // ==========================================================
        // C. 「更新」ボタンクリック処理 (API連携) (イベント委譲)
        // ==========================================================

		// 1. 入出庫状況の更新
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
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            if (typeof formatDate === 'undefined') {
                const errorMessage = "時刻フォーマット関数が未定義です。common.jsを確認してください。";
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                return;
            }
            const currentTime = formatDate(new Date());

            let extraField = null;
            let extraValue = '';
            const newStatusName = selectElement.options[selectElement.selectedIndex].textContent.trim();
            
            if (fieldName === 'busSituation') {
                
                if (newStatusName === '下車出発済') {
                    extraField = 'emptybusDepTime';
                    extraValue = currentTime;
                } 
                else if (newStatusName === '乗車出発済') {
                    extraField = 'departureTime';
                    extraValue = currentTime;
                }
            }
            
            try {
                const result = await sendUpdateToServer(
                    '/api/bus/update', 
                    recordId, 
                    fieldName, 
                    newValueId, 
                    extraField, 
                    extraValue,
                    TARGET_TAB_ID 
                );
                
                const viewMode = cell.querySelector('.view-mode-text');
                viewMode.textContent = newStatusName;
                cell.setAttribute('data-status-id', newValueId); 
                
                const updateTimeCell = row.querySelector('.js-update-time-field'); 
                if (updateTimeCell) updateTimeCell.textContent = result.updateTime || currentTime; 
                
                if (fieldName === 'busSituation') {
                    const timePart = (result.updateTime || currentTime).split(' ')[1] || '';

                    if (newStatusName === '下車出発済') {
                        const emptyBusDepTimeCell = row.querySelector('.js-emptybus-dep-time-field'); 
                        if (emptyBusDepTimeCell) emptyBusDepTimeCell.textContent = timePart;
                    } 
                    else if (newStatusName === '乗車出発済') {
                        const depTimeCell = row.querySelector('td:nth-child(7)'); 
                        if (depTimeCell) depTimeCell.textContent = timePart;
                    }
                }
                
                cell.classList.remove('is-editing');
                viewMode.style.display = 'inline'; 
                
                if (typeof highlightCellAndId === 'function') highlightCellAndId(cell);
                
                const successMessage = `ID: ${recordId} の 入出庫状況 を ${newStatusName} に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                console.error('API呼び出しエラー:', error);
                const errorMessage = `ID: ${recordId} - 更新に失敗しました。詳細: ${error.message}`;
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                cell.querySelector('.js-cancel-button-bus').click(); 
            }
        });
        
        // 2. 乗車数の更新
        busTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-passengers-button');
            if (!updateButton) return;
            
            e.stopPropagation(); 
            if (updateButton.tagName === 'BUTTON') e.preventDefault();

            const cell = updateButton.closest('.js-passengers-field');
            const row = updateButton.closest('tr');
            const recordId = getBusRecordId(updateButton);
            if (!recordId) return; 

            const selectElement = cell.querySelector('.riders-select'); 
            const passengersText = cell.querySelector('.passengers-text');
            const editForm = cell.querySelector('.edit-mode-select');

            const fieldName = 'passengers'; 
            const newValue = selectElement.value; 
            const newText = selectElement.options[selectElement.selectedIndex].textContent.trim();

            if (!newValue || newValue.trim() === '') {
                 const errorMessage = '乗車数を選択してください。';
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            const originalValue = passengersText.dataset.originalValue; 
            if (newValue === originalValue) {
                cell.querySelector('.js-cancel-passengers-button').click();
                return;
            }

            if (typeof formatDate === 'undefined') {
                 const errorMessage = "時刻フォーマット関数が未定義です。common.jsを確認してください。";
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 cell.querySelector('.js-cancel-passengers-button').click();
                 return;
            }

            try {
                const result = await sendUpdateToServer(
                    '/api/bus/update', 
                    recordId, 
                    fieldName, 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID 
                );

                passengersText.textContent = newText + '名';
                passengersText.dataset.originalValue = newText; 
                
                const updateTimeCell = row.querySelector('.js-update-time-field');
                if (updateTimeCell) updateTimeCell.textContent = result.updateTime;

                cell.classList.remove('is-editing');
                passengersText.style.display = 'inline';
                editForm.style.display = 'none'; 
                
                if (typeof highlightCellAndId === 'function') highlightCellAndId(cell);

                const successMessage = `ID: ${recordId} の 乗車数 を ${newText}名 に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                const errorMessage = `ID: ${recordId} - 乗車人数の更新に失敗しました: ${error.message || '不明なエラー'}`;
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                console.error('Update error:', error);
                cell.querySelector('.js-cancel-passengers-button').click();
            }
        });
        
        // 3. 備考欄の更新
        busTableBody.addEventListener('submit', async (e) => {
            const editForm = e.target.closest('.remarks-edit-form');
            if (!editForm) return;

            e.preventDefault(); 
            e.stopPropagation(); 
            
            const cell = editForm.closest('.js-remarks-field');
            const row = editForm.closest('tr');
            
            const recordId = getBusRecordId(editForm);
            if (!recordId) return; 

            const textarea = editForm.querySelector('.remarks-textarea');
            const newValue = textarea.value;
            const fieldName = 'remarksColumn'; 

            const originalValue = textarea.dataset.originalValue;
            if (newValue === originalValue) {
                cell.querySelector('.cancel-remarks-button').click();
                return;
            }

            try {
                const result = await sendUpdateToServer(
                    '/api/bus/update', 
                    recordId, 
                    fieldName, 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID 
                );

                const remarksText = cell.querySelector('.remarks-text');
                remarksText.textContent = newValue; 
                textarea.dataset.originalValue = newValue; 
                
                const updateTimeCell = row.querySelector('.js-update-time-field');
                if (updateTimeCell) updateTimeCell.textContent = result.updateTime;

                cell.classList.remove('is-editing');
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden';
                remarksText.style.display = 'inline';
                
                if (typeof highlightCellAndId === 'function') highlightCellAndId(cell);

                const successMessage = `ID: ${recordId} の 備考欄 を更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                const errorMessage = `ID: ${recordId} - 備考欄の更新に失敗しました: ${error.message || '不明なエラー'}`;
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                console.error('Update error:', error);
                cell.querySelector('.cancel-remarks-button').click();
            }
        });


	} // busTableBody の if の閉じ

}); // DOMContentLoaded の閉じ


// ==========================================================
// IV. リモート更新ハンドラ (common.jsからの呼び出し用)
// ==========================================================

/**
 * リモートから受け取った更新データに基づき、送迎バスリストの画面表示を更新する。
 * この関数は common.js の handleRemoteUpdate から 'bus' エンティティの更新時に呼び出されます。
 * * @param {string} id - 更新されたレコードID (data-bus-id)
 * @param {string} field - 更新されたフィールド名 (e.g., 'busSituation', 'passengers', 'remarksColumn')
 * @param {string} newValue - 更新後のIDまたは値 (e.g., '101', '5', '新しいコメント')
 * @param {string} updateTime - 更新時刻 (e.g., '2025/10/29 14:30:00')
 */
window.updateBusRow = function(id, field, newValue, updateTime) {
    console.log(`DEBUG: Remote update received for Bus ID ${id}. Field: ${field}, Value: ${newValue}`);

    const row = document.querySelector(`#content3 tr[data-bus-id="${id}"]`);
    if (!row) {
        console.warn(`WARN: Bus Record ID ${id} not found for remote update.`);
        return;
    }

    let targetCell;
    let newDisplayValue = newValue; 

    // ------------------------------------------
    // 1. セル値の更新
    // ------------------------------------------
    if (field === 'busSituation') {
        targetCell = row.querySelector('.js-bus-status');
        
        const situation = busSituationsData.find(s => String(s.id) === String(newValue));
        if (situation) {
            newDisplayValue = situation.name;
        } else {
             console.warn(`WARN: Bus situation ID ${newValue} not found in local data.`);
        }
        
        if (targetCell) {
            targetCell.querySelector('.view-mode-text').textContent = newDisplayValue;
            targetCell.setAttribute('data-status-id', newValue); 
            
            const timePart = updateTime.split(' ')[1] || ''; 
            if (newDisplayValue === '下車出発済') {
                row.querySelector('.js-emptybus-dep-time-field').textContent = timePart;
            } else if (newDisplayValue === '乗車出発済') {
                row.querySelector('td:nth-child(7)').textContent = timePart; 
            }
        }

    } else if (field === 'passengers') {
        targetCell = row.querySelector('.js-passengers-field');
        newDisplayValue = newValue;
        
        if (targetCell) {
            targetCell.querySelector('.passengers-text').textContent = newDisplayValue + '名';
            targetCell.querySelector('.passengers-text').dataset.originalValue = newDisplayValue; 
        }
        
    } else if (field === 'remarksColumn') { // 💡 備考欄のフィールド名は 'remarksColumn' を使用
        targetCell = row.querySelector('.js-remarks-field'); 
        newDisplayValue = newValue;
        
        if (targetCell) {
            // 💡 修正: HTMLに合わせて .remarks-text を使用
            const remarksText = targetCell.querySelector('.remarks-text');
            if (remarksText) {
                remarksText.textContent = newDisplayValue;
            }

            // 編集フォームの隠れた要素も更新し、編集モードに入ったときに最新値となるようにする
            const textarea = targetCell.querySelector('.remarks-textarea');
            if(textarea) {
                textarea.setAttribute('data-original-value', newDisplayValue);
                textarea.textContent = newDisplayValue; 
                textarea.value = newDisplayValue;
            }
        }
        
    } else {
        console.warn(`WARN: Remote update for unhandled field: ${field}`);
        return;
    }
    // ------------------------------------------
    // 2. 最終更新時刻の更新
    // ------------------------------------------
    if (updateTime) {
        const updateTimeCell = row.querySelector('.js-update-time-field');
        if (updateTimeCell) {
            updateTimeCell.textContent = updateTime; 
        }
    }

    // ------------------------------------------
    // 3. ハイライトの実行
    // ------------------------------------------
    if (targetCell && typeof highlightCellAndId === 'function') {
        highlightCellAndId(targetCell); 
        
        const fieldJp = field === 'remarksColumn' ? '備考' : field;
        const successMessage = `リモート更新：ID ${id} の ${fieldJp} を ${newDisplayValue} に更新しました。`;
        if (typeof updateOperationResultField === 'function') {
             updateOperationResultField(CONTENT_SELECTOR, true, successMessage);
        }
    }
};