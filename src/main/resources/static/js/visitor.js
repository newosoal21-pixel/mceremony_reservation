/**
 * visitor.js
 * * 来館者リスト (#content2) の機能とロジック
 * * 備考欄処理 (#content1, #content2, #content3)
 * * 依存: common.js (sendUpdateToServer, formatDate, showNotification, getCheckedTabId, ...)
 * * 修正 V7: HTML側のID属性変更（th:data-record-id -> data-visit-id in <tr>）に合わせて、
 * * レコードIDの取得方法を data-visit-id から取得するように修正しました。
 */

// ------------------------------------------------------------------
// --- 新規追加: セル単位のハイライト関数 (自動解除なし) ---
// ------------------------------------------------------------------

/**
 * 更新されたセルと、その行のリストIDセルをハイライトする。
 * 以前のハイライトは全て解除される。
 * @param {HTMLElement} updatedCell - 更新されたtd要素
 */
function highlightCellAndId(updatedCell) {
    // 1. 以前のハイライトを全てクリア
    // (visitor.jsが動いているタブだけでなく、全タブからクリア)
    document.querySelectorAll('.highlight-cell').forEach(cell => {
        cell.classList.remove('highlight-cell');
    });

    const row = updatedCell.closest('tr');
    if (!row) return;

    // 2. IDセル (js-list-id-field) を取得
    const idCell = row.querySelector('.js-list-id-field') || row.querySelector('td:nth-child(1)');

    // 3. ハイライトを適用
    updatedCell.classList.add('highlight-cell');
    if (idCell) {
        idCell.classList.add('highlight-cell');
    }

    // 🔴 setTimeoutブロックを削除したため、ハイライトは次の更新まで維持されます。
}

// ------------------------------------------------------------------
// 💡 ID取得ヘルパー関数 (V7 追加)
// ------------------------------------------------------------------
/**
 * 親の<tr>からレコードIDを抽出するユーティリティ関数 (V7修正)
 * @param {HTMLElement} element - クリックされた要素
 * @returns {string|null} レコードID
 */
function getVisitorRecordId(element) {
    const row = element.closest('tr');
    // 💡 修正点: <tr>から data-visit-id 属性を取得する
    const recordId = row ? row.getAttribute('data-visit-id') : null;
    if (!recordId) {
        console.error("エラー: 来館者レコードID (data-visit-id) が見つかりません。");
    }
    return recordId;
}


// ------------------------------------------------------------------
// --- 既存ロジックの開始 ---
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: visitor.js (備考欄処理を含む) の実行が開始されました。"); 
    
    // 💡 【維持】タブごとの結果表示フィールドIDを定義
    const RESULT_FIELD_IDS = {
        '#content1': "last-operation-result-tab1", // 駐車場リスト
        '#content2': "last-operation-result-tab2", // 来館者リスト
        '#content3': "last-operation-result-tab3"  // 送迎バスリスト
    };
    
    // 💡 【維持】結果表示を更新する関数 (折り返し制御を追加)
    function updateOperationResultField(contentSelector, success, message) {
        const fieldId = RESULT_FIELD_IDS[contentSelector];
        if (!fieldId) {
            console.error(`結果フィールドIDが見つかりません: ${contentSelector}`);
            return;
        }
        
        const resultDiv = document.getElementById(fieldId);
        const resultSpan = resultDiv ? resultDiv.querySelector('span') : null;

        // 🟢 【修正適用】結果表示Divにスタイルを追加し、折り返しを制御
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
         // 💡 通知トーストも合わせて表示 (common.jsの関数に依存)
         if (typeof showNotificationToast === 'function') {
             showNotificationToast(message, success ? 'success' : 'error');
         } else {
             console.warn("common.js の showNotificationToast 関数が見つかりません。");
             // エラー時のみcommon.jsのshowNotificationにフォールバックさせます
             if (typeof showNotification === 'function' && !success) {
                 const currentTabId = getCheckedTabId();
                 showNotification(message, 'error', currentTabId);
             }
         }
    }


    // ------------------------------------------------------------------
    // --- 4. 来館状況 (content2) の処理 ---
    // ------------------------------------------------------------------
    const visitSituationCells = document.querySelectorAll('#content2 .js-visit-situation');

	// 🔴 DBのID値に合わせて修正してください 🔴
    const COMPLETED_SITUATION_IDS = ['2', '3']; // 例: ID 2=案内済, 3=退館済 を完了とみなす
    // ------------------------------------------

    visitSituationCells.forEach(cell => {
		
		// 1. 各要素を取得
		    const viewModeText = cell.querySelector('.view-mode-text');
		    const editModeSelect = cell.querySelector('.edit-mode-select');
		    
		    if (!viewModeText || !editModeSelect) {
		        console.error("Visit Situation processing: Required sub-elements not found in cell.", cell);
		        return;
		    }
		    
		    // 2. 編集モード内の要素を取得
		    const selectElement = editModeSelect.querySelector('.situation-select');
		    const updateButton = editModeSelect.querySelector('.js-update-button-visit');
		    const cancelButton = editModeSelect.querySelector('.js-cancel-button-visit');

		    if (!selectElement || !updateButton || !cancelButton) {
		        console.error("Visit Situation processing: Edit mode buttons/select not found.", cell);
		        return;
		    }

        editModeSelect.style.display = 'none'; 
        editModeSelect.style.visibility = 'hidden';

        // ==========================================================
        // イベントリスナー（クリックと更新処理）
        // ==========================================================
        
        // <td>クリック (編集モードへ切り替え)
        cell.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            if (editModeSelect.style.display !== 'none' || editModeSelect.contains(e.target)) {
                return;
            }

            // data-situation-id (DBのID) を取得
            const currentSituationId = cell.getAttribute('data-situation-id'); 
            selectElement.value = currentSituationId; 
        
            // 表示モードを非表示
            viewModeText.style.display = 'none';
            viewModeText.style.visibility = 'hidden';

            // 編集モードを表示
            editModeSelect.style.display = 'flex'; 
            editModeSelect.style.visibility = 'visible';

            selectElement.focus(); 
        });

		// 更新ボタンが押されたとき (編集 -> 表示 & AJAX POST処理)
		updateButton.addEventListener('click', function(e) {
		    e.stopPropagation(); 
		        
		    const newValueId = selectElement.value; // visit_situation_id
		    const newTextName = selectElement.options[selectElement.selectedIndex].textContent; // situationName
		            
		    // 💡 修正 V7: ID取得をヘルパー関数に変更
            const visitId = getVisitorRecordId(updateButton);
            if (!visitId) {
                updateOperationResultField('#content2', false, 'レコードIDの取得に失敗しました。');
                return;
            }

		    // ----------------------------------------------------------------
            // 🔴 対応完了時刻 (compilationCmpTime) の更新ロジック
            // ----------------------------------------------------------------
            const currentTime = new Date();
            // common.js の formatDate に依存
            const formattedTime = formatDate(currentTime);
            
            let extraField = 'compilationCmpTime';
            let extraValue = ''; // 基本は空文字（NULL）
            
            if (COMPLETED_SITUATION_IDS.includes(newValueId)) {
                // 💡 「案内済」または「退館済」の場合、compilationCmpTimeを更新する
                extraValue = formattedTime;
            } 
		    // ----------------------------------------------------------------

		    // 🔴 API呼び出し: Visitor APIを使用
		    // 💡 common.js の sendUpdateToServer を使用
		    sendUpdateToServer('/api/visitor/update', visitId, 'visitSituation', newValueId, extraField, extraValue, 'tab2') 
		          .then(() => {
		            
		              const row = cell.closest('tr');
		              const updateTimeField = row.querySelector('.js-update-time-field');
		              const cmpTimeField = row.querySelector('.js-compilation-cmp-time-field');
		              
		              // 来館状況のテキスト（表示）を更新
		              viewModeText.textContent = newTextName;
		              cell.setAttribute('data-situation-id', newValueId); 

		              // 対応完了時刻と更新日時を更新
                      // 💡 更新日時フィールドは、来館状況が変わったかどうかにかかわらず更新する
		              if (cmpTimeField) {
		                  // extraValue (時刻文字列または空文字) を設定
		                  cmpTimeField.textContent = extraValue; 
		              }
		              
		              if (updateTimeField) {
		                  updateTimeField.textContent = formattedTime;
		              }
		              // ----------------------------------------------------------------
                      
                      // 💡 修正適用 1: 更新成功時にセルとIDをハイライト
                      highlightCellAndId(cell);

	                  viewModeText.style.display = 'inline-block'; 
                      viewModeText.style.visibility = 'visible';
			                
			          // 編集モードを非表示
			          editModeSelect.style.display = 'none';
                      editModeSelect.style.visibility = 'hidden';
			          
			          // 💡 ID情報を含むメッセージで固定フィールドを更新
                      const successMessage = `ID: ${visitId} - 来館状況と対応完了時刻が更新されました！`;
                      updateOperationResultField('#content2', true, successMessage);
			          })
			          .catch(error => {
			              console.error('来館状況の更新エラー:', error);
			             
			             // 💡 ローカル関数でエラー表示
                         updateOperationResultField('#content2', false, '来館状況の更新に失敗しました。詳細はコンソールを確認してください。');
			          });
		});
		
		// キャンセルボタンの処理（DOMを元に戻す）
	    cancelButton.addEventListener('click', function(e) {
	         e.stopPropagation(); 
	         editModeSelect.style.display = 'none';
             editModeSelect.style.visibility = 'hidden';
	         viewModeText.style.display = 'inline-block';
             viewModeText.style.visibility = 'visible';
             
             // 元のID値に戻す
             const originalSituationId = cell.getAttribute('data-situation-id'); 
             selectElement.value = originalSituationId;
	    });
        
	});


	// ------------------------------------------------------------------
	// --- 6. 備考欄 (content1, content2, content3) の処理 (汎用) ---
	// ------------------------------------------------------------------

	// セレクタはHTML構造に依存するためそのまま維持
	const remarksFields = document.querySelectorAll('#content1 .js-remarks-field, #content2 .js-remarks-field-visit, #content3 .js-remarks-field');

	remarksFields.forEach(field => {
	    // 1. 各要素を取得
	    const textSpan = field.querySelector('.remarks-text');
	    const editForm = field.querySelector('.remarks-edit-form');
	    const textarea = field.querySelector('.remarks-textarea');
	    const row = field.closest('tr'); // 行全体も取得
	    
	    if (!textSpan || !editForm || !textarea || !row) {
	        console.error("Remarks processing: Required sub-elements not found in field or row.", field);
	        return; 
	    }

	    // 2. 現在のセルがどのリストかによってボタンのセレクタとAPIパスを決定
	    let updateClass;
	    let cancelClass;
	    let apiPath;
	    let recordIdAttribute; // 行からIDを取得するための属性名
	    let contentSelector; // 💡 どのタブの結果フィールドを更新するかを識別するためのセレクタ
	    
	    if (row.closest('#content1')) {
	        // 駐車場リスト
	        updateClass = '.update-remarks-button';
	        cancelClass = '.cancel-remarks-button';
	        apiPath = '/api/parking/update';
	        recordIdAttribute = 'data-parking-id'; // <tr th:attr="data-parking-id=${parking.id}"> から取得
	        contentSelector = '#content1';
	    } else if (row.closest('#content2')) {
	        // 来館者リスト
	        updateClass = '.update-remarks-button-visit';
	        cancelClass = '.cancel-remarks-button-visit';
	        apiPath = '/api/visitor/update';
	        recordIdAttribute = 'data-visit-id'; // <tr th:attr="data-visit-id=${visit.id}"> から取得
	        contentSelector = '#content2'; // 💡 タブ2
	    } else if (row.closest('#content3')) {
	        // 送迎バスリスト
	        updateClass = '.update-remarks-button'; // (content1と共有)
	        cancelClass = '.cancel-remarks-button'; // (content1と共有)
	        apiPath = '/api/bus/update'; 
	        recordIdAttribute = 'data-bus-id'; 
	        contentSelector = '#content3'; // 💡 タブ3
	    } else {
	        console.error('Error: Failed to determine API path for remarks update.');
	        return;
	    }

	    // 3. 適切なセレクタでボタンを取得
	    const updateButton = editForm.querySelector(updateClass);
	    const cancelButton = editForm.querySelector(cancelClass);

	    if (!updateButton || !cancelButton) {
	        console.error(`Error: Update or Cancel button not found for remarks field. Skipping element.`, field);
	        return; 
	    }
	    
	    // フォームを確実に非表示に設定
	    editForm.style.display = 'none';
	    editForm.style.visibility = 'hidden';
	    
	    // <td>クリック (編集モードへ切り替え)
	    field.addEventListener('click', function(e) {
	        e.stopPropagation();
	        
	        if (editForm.style.display !== 'none' || editForm.contains(e.target)) {
	             return;
	        }
	        
	        textarea.value = textSpan.textContent;
	        
	        // 表示モードを非表示
	        textSpan.style.display = 'none';
	        textSpan.style.visibility = 'hidden';
	        
	        editForm.style.display = 'flex'; 
	        editForm.style.visibility = 'visible';
	        textarea.focus(); 
	    });

	    // 更新ボタンのイベントリスナー
	    updateButton.addEventListener('click', function(e) {
	        e.preventDefault(); 
	        e.stopPropagation();
	        
	        const newRemarks = textarea.value;
	        
	        // 💡 修正 V7: 常に<tr>の属性からIDを取得する
	        let finalRecordId = row.getAttribute(recordIdAttribute);
	        
	        // IDが取得できているかチェック
	        if (!finalRecordId) {
	            console.error(`Error: Record ID not found for remarks update in ${contentSelector}. Attribute: ${recordIdAttribute}`, row);
	            updateOperationResultField(contentSelector, false, 'レコードIDの取得に失敗しました。');
	            return;
	        }
	        
	        const fieldName = 'remarksColumn';
	        
	        // 💡 common.js の sendUpdateToServer を使用
	        sendUpdateToServer(apiPath, finalRecordId, fieldName, newRemarks, null, null, contentSelector.replace('#content', 'tab'))
	            .then(() => {
	                // 成功した場合のみDOMを更新
	                textSpan.textContent = newRemarks;
	                // 表示モードを再表示
	                textSpan.style.display = 'inline-block';
	                textSpan.style.visibility = 'visible';
	                // 編集モードを非表示
	                editForm.style.display = 'none';
	                editForm.style.visibility = 'hidden';
	                
	                // 更新日時も更新
	                const updateTimeField = row.querySelector('.js-update-time-field');
	                // common.js の formatDate に依存
	                const formattedTime = formatDate(new Date()); 
	                if (updateTimeField) {
	                    updateTimeField.textContent = formattedTime; 
	                }
	                
                    // 💡 修正適用 2: 更新成功時にセルとIDをハイライト
                    highlightCellAndId(field);
	                
	                // 💡 ID情報を含むメッセージで固定フィールドを更新
                    const successMessage = `ID: ${finalRecordId} - 備考欄が更新されました！`;
	                updateOperationResultField(contentSelector, true, successMessage);
	            })
	            .catch(error => {
	                console.error('備考欄の更新エラー:', error);
	                
	                // 💡 ローカル関数でエラー表示
	                updateOperationResultField(contentSelector, false, '備考欄の更新に失敗しました。詳細はコンソールを確認してください。');
	                
	                // 編集前の値に戻す
	                textarea.value = textSpan.textContent; 
	            });
	    }); 
	    
	    // 取消ボタンのイベントリスナー
	    cancelButton.addEventListener('click', function(e) {
	        e.stopPropagation();
	        
	        // 編集前の値に戻す
	        textarea.value = textSpan.textContent;
	        
	        // 編集モードを非表示に戻す
	        editForm.style.display = 'none';
	        editForm.style.visibility = 'hidden';
	        // 表示モードに戻す
	        textSpan.style.display = 'inline-block';
	        textSpan.style.visibility = 'visible';
	    });
	});

    // ------------------------------------------------------------------
    // D. リモート更新後のDOM操作関数 (common.jsのhandleRemoteUpdateから呼び出される)
    // ------------------------------------------------------------------

    // 💡 common.jsから呼び出されるグローバル関数として定義
    window.updateVisitorRow = function(id, fieldName, newValue, updateTime) {
        console.log(`DEBUG: updateVisitorRow called for ID ${id}, Field: ${fieldName}`);
        
        // IDが一致する行を検索
        const row = document.querySelector(`#content2 tr[data-visit-id="${id}"]`);
        if (!row) {
            console.warn(`WARN: Visitor row with ID ${id} not found for remote update.`);
            return;
        }

        // 最終更新日時を更新
        const updateTimeCell = row.querySelector('.js-update-time-field');
        if (updateTimeCell) {
            updateTimeCell.textContent = updateTime;
        }

        let targetCell;
        
        switch (fieldName) {
            case 'visitSituation':
                targetCell = row.querySelector('.js-visit-situation');
                if (targetCell) {
                    // IDを更新
                    targetCell.setAttribute('data-situation-id', newValue);
                    
                    // ステータス名（テキスト）を取得し更新 (newValueを基にローカルで探すか、HTMLに依存)
                    const selectElement = targetCell.querySelector('.situation-select');
                    let newStatusName = '更新済み'; // デフォルト値

                    if (selectElement) {
                        const option = Array.from(selectElement.options).find(opt => String(opt.value) === String(newValue));
                        if (option) {
                            newStatusName = option.textContent;
                        }
                    }
                    
                    const viewMode = targetCell.querySelector('.view-mode-text');
                    if (viewMode) viewMode.textContent = newStatusName;

                    // 対応完了時刻の更新 (newValueが完了IDなら、updateTimeを適用)
                    if (COMPLETED_SITUATION_IDS.includes(String(newValue))) {
                         const cmpTimeField = row.querySelector('.js-compilation-cmp-time-field');
                         if (cmpTimeField) cmpTimeField.textContent = updateTime;
                    } else {
                         // 完了ステータスでない場合は時刻をクリアするロジックが必要な場合がある
                         // 例: cmpTimeField.textContent = '';
                    }
                }
                break;
                
            case 'remarksColumn':
                targetCell = row.querySelector('.js-remarks-field-visit');
                if (targetCell) {
                    const viewText = targetCell.querySelector('.remarks-text');
                    const textarea = targetCell.querySelector('.remarks-textarea');
                    if (viewText) viewText.textContent = newValue;
                    if (textarea) textarea.value = newValue; 
                }
                break;

            default:
                console.warn(`WARN: Remote update field ${fieldName} not handled in visitor.js.`);
                return; 
        }

        // 更新されたセルとIDをハイライト
        if (targetCell && typeof highlightCellAndId === 'function') {
            highlightCellAndId(targetCell);
        }
    };


}); // DOMContentLoaded の閉じ