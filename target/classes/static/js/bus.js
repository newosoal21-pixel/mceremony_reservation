/**
 * bus.js
 * * 送迎バス運行リスト (#content3) の機能とロジック
 * * 修正 V9.3 (最終版):
 * * 1. 乗車数（js-passengers-field）の編集モードの表示・位置制御を、
 * * **JavaScriptによるスタイル強制** にて実装。これにより、PC表示時の位置ずれを回避し、
 * * セルの真下にボタンが縦並びで表示されることを目指す。
 * * 2. HTML側の <td>.js-passengers-field に style="position: relative;" が適用されていることが前提。
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: bus.js の実行が開始されました。"); 
    
    const busContent = document.getElementById('content3');
    if (!busContent) return; // タブ3がない場合は終了

    // 💡 ターゲットタブIDとセレクタを定義
    const TARGET_TAB_ID = 'tab3';
    const CONTENT_SELECTOR = '#content3';
    
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
	let busSituationsData = []; 
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
	        // JSによる表示制御はCSSに委ねる
            
	        if(selectElement) selectElement.focus();
	    });
        
        // 2. 乗車数 (セレクタ方式) - 💡 修正: スタイルをJSで強制的に付与し、意図した位置に表示させる
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

            // 💡 修正: JSで編集フィールドの表示と位置を強制制御する
            editMode.style.display = 'flex';
            editMode.style.flexDirection = 'column'; // 縦並びを強制
            
            // 💡 絶対配置を強制し、セルから下に展開させる
            editMode.style.position = 'absolute';
            editMode.style.top = '100%';
            editMode.style.left = '0';
            editMode.style.zIndex = '10';
            // 見た目の調整（CSSの上書き対策と視認性確保）
            editMode.style.width = 'auto'; // 幅は内容物で決まる
            editMode.style.whiteSpace = 'nowrap'; // 枠からはみ出すのを許可
            editMode.style.backgroundColor = '#f8f9fa'; 
            editMode.style.border = '1px solid #ccc';
            editMode.style.padding = '5px';
            
            selectElement.focus();
        });


	    // ==========================================================
        // B. 「取消」ボタンクリック処理 (イベント委譲)
        // ==========================================================

	    // 1. 入出庫状況の取消 (既存ロジック維持 - CSSが制御)
	    busTableBody.addEventListener('click', (e) => {
	        const cancelButton = e.target.closest('.js-cancel-button-bus');
	        if (!cancelButton) return;

	        const cell = cancelButton.closest('.js-bus-status');
	        
	        const viewMode = cell.querySelector('.view-mode-text');
	        const editMode = cell.querySelector('.edit-mode-select');
	        
	        if (viewMode && editMode) {
	            cell.classList.remove('is-editing');
	            viewMode.style.display = 'inline';
	            // editMode.style.display = 'none'; // CSSが制御
	            
	            const originalStatusId = cell.getAttribute('data-status-id');
	            const selectElement = cell.querySelector('.js-bus-situation-select');
	            if (selectElement && originalStatusId) {
	                selectElement.value = originalStatusId;
	            }
	        }
	    });
        
        // 2. 乗車数の取消 (💡 修正: JSで表示を確実に非表示にする)
        busTableBody.addEventListener('click', (e) => {
            const cancelButton = e.target.closest('.js-cancel-passengers-button');
            if (!cancelButton) return;

            const cell = cancelButton.closest('.js-passengers-field');
            const selectElement = cell.querySelector('.riders-select');
            const passengersText = cell.querySelector('.passengers-text');
            const editMode = cell.querySelector('.edit-mode-select'); 
            
            if (cell && cell.classList.contains('is-editing')) {
                // 元の値に戻す 
                const originalValue = passengersText.dataset.originalValue || passengersText.textContent.replace('名', '').trim();
                if (selectElement) selectElement.value = originalValue; 
                
                cell.classList.remove('is-editing');

                // 表示モードに戻す
                passengersText.style.display = 'inline';
                
                // 💡 修正: JSで編集モードを確実に非表示にする
                editMode.style.display = 'none'; 
            }
        });


	    // ==========================================================
        // C. 「更新」ボタンクリック処理 (API連携) (イベント委譲)
        // ==========================================================

		// 1. 入出庫状況の更新 (既存ロジック維持 - CSSが制御)
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
                console.error("ERROR: formatDate関数がcommon.jsで見つかりません。");
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
                // const editMode = cell.querySelector('.edit-mode-select'); // CSS制御のため不要
                
                viewMode.textContent = newStatusName;
                cell.setAttribute('data-status-id', newValueId); 
                
                const updateTimeCell = row.querySelector('.js-update-time-field'); 
                
                if (updateTimeCell) {
                     updateTimeCell.textContent = result.updateTime || currentTime; 
                }
                
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
                // editMode.style.display = 'none'; // CSS制御
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }
                
                // ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 入出庫状況 を ${newStatusName} に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);


            } catch (error) {
                // --- 失敗時のロジック ---
                console.error('API呼び出しエラー:', error);
                
                const errorMessage = `ID: ${recordId} - 更新に失敗しました。詳細: ${error.message}`;
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                
                cell.querySelector('.js-cancel-button-bus').click(); 
            }
        });
        
        // 2. 乗車数の更新 (セレクタ方式 - 💡 修正: JSで非表示を確実に制御)
        busTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-passengers-button');
            if (!updateButton) return;
            
            // 他の更新ロジックと競合しないよう、イベント伝播を停止
            e.stopPropagation(); 
            if (updateButton.tagName === 'BUTTON') {
                 e.preventDefault();
            } 

            const cell = updateButton.closest('.js-passengers-field');
            const row = updateButton.closest('tr');
            
            const recordId = getBusRecordId(updateButton);
            if (!recordId) return; 

            const selectElement = cell.querySelector('.riders-select'); 
            const passengersText = cell.querySelector('.passengers-text');
            const editForm = cell.querySelector('.edit-mode-select');

            const fieldName = 'passengers'; 
            const newValue = selectElement.value; // 選択された数値 (文字列)
            const newText = selectElement.options[selectElement.selectedIndex].textContent.trim();

            if (!newValue || newValue.trim() === '') {
                 const errorMessage = '乗車数を選択してください。';
                 updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                 return;
            }
            
            const originalValue = passengersText.dataset.originalValue; // data-original-valueから取得
            if (newValue === originalValue) {
                cell.querySelector('.js-cancel-passengers-button').click();
                return;
            }

            if (typeof formatDate === 'undefined') {
                 console.error("ERROR: formatDate関数がcommon.jsで見つかりません。");
                 const errorMessage = "時刻フォーマット関数が未定義です。common.jsを確認してください。";
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
                    fieldName, 
                    newValue, 
                    null, 
                    null,
                    TARGET_TAB_ID 
                );

                // --- 成功時のロジック ---
                const updateTimeCell = row.querySelector('.js-update-time-field');
                        
                passengersText.textContent = newText + '名';
                passengersText.dataset.originalValue = newText; 
                
                if (updateTimeCell) {
                    updateTimeCell.textContent = result.updateTime || currentTime;
                }
                
                // 表示モードに戻す
                cell.classList.remove('is-editing');
                passengersText.style.display = 'inline';
                
                // 💡 修正: JSで編集モードを確実に非表示にする
                editForm.style.display = 'none'; 
                
                if (typeof highlightCellAndId === 'function') {
                    highlightCellAndId(cell);
                }

                // ローカル通知関数でメッセージを強制表示
                const successMessage = `ID: ${recordId} の 乗車数 を ${newText}名 に更新しました。`;
                updateOperationResultField(CONTENT_SELECTOR, true, successMessage);

            } catch (error) {
                // 失敗時のロジック
                const errorMessage = `ID: ${recordId} - 乗車人数の更新に失敗しました: ${error.message || '不明なエラー'}`;
                updateOperationResultField(CONTENT_SELECTOR, false, errorMessage);
                console.error('Update error:', error);
                cell.querySelector('.js-cancel-passengers-button').click();
            }
        });


	} // busTableBody の if の閉じ
	
	// bus.js のコードの最後に追加してください。

	/**
	 * リモートから受け取った更新データに基づき、送迎バスリストの画面表示を更新する。
	 * この関数は common.js の handleRemoteUpdate から 'bus' エンティティの更新時に呼び出されます。
	 * * NOTE: common.js の更新メッセージに 'newText', 'emptyBusDepTime', 'departureTime' が含まれるか不明なため、
	 * 今回は必要なデータをローカルで取得/生成して更新します。
	 * * @param {string} id - 更新されたレコードID (data-bus-id)
	 * @param {string} field - 更新されたフィールド名 (e.g., 'busSituation', 'passengers')
	 * @param {string} newValue - 更新後のIDまたは値 (e.g., '101', '5')
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
	    let newDisplayValue = newValue; // デフォルト値

	    // ------------------------------------------
	    // 1. セル値の更新
	    // ------------------------------------------
	    if (field === 'busSituation') {
	        targetCell = row.querySelector('.js-bus-status');
	        
	        // 💡 サーバーから送られたnewValue(ID)に基づき、表示テキスト（日本語名）をローカルデータから検索
	        const situation = busSituationsData.find(s => String(s.id) === String(newValue));
	        if (situation) {
	            newDisplayValue = situation.name;
	        } else {
	             console.warn(`WARN: Bus situation ID ${newValue} not found in local data.`);
	        }
	        
	        if (targetCell) {
	            targetCell.querySelector('.view-mode-text').textContent = newDisplayValue;
	            targetCell.setAttribute('data-status-id', newValue); // IDも更新
	            
	            // 付随する時刻フィールドの更新 (乗車出発済/下車出発済の場合)
	            const currentTime = updateTime.split(' ')[1] || ''; // 時刻部分を取得（例: 14:30:00）
	            if (newDisplayValue === '下車出発済') {
	                row.querySelector('.js-emptybus-dep-time-field').textContent = currentTime;
	            } else if (newDisplayValue === '乗車出発済') {
	                // 乗車出発時刻のセルセレクタ (例: td:nth-child(7)) が正確であることを確認
	                row.querySelector('td:nth-child(7)').textContent = currentTime; 
	            }
	        }

	    } else if (field === 'passengers') {
	        targetCell = row.querySelector('.js-passengers-field');
	        newDisplayValue = newValue;
	        
	        if (targetCell) {
	            // 表示は '5名' の形式
	            targetCell.querySelector('.passengers-text').textContent = newDisplayValue + '名';
	            // オリジナル値のデータ属性も更新
	            targetCell.querySelector('.passengers-text').dataset.originalValue = newDisplayValue; 
	        }
	        
	    } else {
	        console.warn(`WARN: Remote update for unhandled field: ${field}`);
	        return;
	    }

	    // ------------------------------------------
	    // 2. 最終更新時刻の更新
	    // ------------------------------------------
	    if (updateTime) {
	        row.querySelector('.js-update-time-field').textContent = updateTime.split(' ')[1]; // 時刻部分のみ表示
	    }

	    // ------------------------------------------
	    // 3. ハイライトの実行
	    // ------------------------------------------
	    if (targetCell && typeof highlightCellAndId === 'function') {
	        // common.js の highlightCellAndId を呼び出す
	        highlightCellAndId(targetCell); 
	        
	        // ローカル通知メッセージを表示
	        const successMessage = `リモート更新：ID ${id} の ${field} を ${newDisplayValue} に更新しました。`;
	        // updateOperationResultField は bus.js 内で定義されているはず
	        if (typeof updateOperationResultField === 'function') {
	             updateOperationResultField(CONTENT_SELECTOR, true, successMessage);
	        }
	    }
	};

	// ... (fetchBusSituations 関数がこの関数より先に実行され、busSituationsData がロードされている必要があります)

}); // DOMContentLoaded の閉じ