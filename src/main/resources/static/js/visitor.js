/**
 * visitor.js
 * * 来館者リスト (#content2) の機能とロジック
 * * 備考欄処理 (#content1, #content2, #content3)
 * * 依存: common.js (sendUpdateToServer, formatDate)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: visitor.js (備考欄処理を含む) の実行が開始されました。"); 
    
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
		            
		    const row = cell.closest('tr');
		    const visitId = row.getAttribute('data-visit-id'); // trタグから data-visit-id を取得

		    // ----------------------------------------------------------------
            // 🔴 対応完了時刻 (compilationCmpTime) の更新ロジック
            // ----------------------------------------------------------------
            const currentTime = new Date();
            const formattedTime = formatDate(currentTime);
            
            let extraField = 'compilationCmpTime';
            let extraValue = ''; // 基本は空文字（NULL）
            
            if (COMPLETED_SITUATION_IDS.includes(newValueId)) {
                // 💡 「案内済」または「退館済」の場合、compilationCmpTimeを更新する
                extraValue = formattedTime;
            } 
            // 💡 それ以外の場合 (来館前/キャンセルなど) は extraValue='' のまま

		    // 🔴 API呼び出し: Visitor APIを使用
		    sendUpdateToServer('/api/visitor/update', visitId, 'visitSituation', newValueId, extraField, extraValue) 
		          .then(() => {
		            
		              const updateTimeField = row.querySelector('.js-update-time-field');
		              const cmpTimeField = row.querySelector('.js-compilation-cmp-time-field');
		              
		              // 来館状況のテキスト（表示）を更新
		              viewModeText.textContent = newTextName;
		              cell.setAttribute('data-situation-id', newValueId); 

		              // 対応完了時刻と更新日時を更新
		              if (cmpTimeField) {
		                  // extraValue (時刻文字列または空文字) を設定
		                  cmpTimeField.textContent = extraValue;
		              }
		              
		              if (updateTimeField) {
		                  updateTimeField.textContent = formattedTime;
		              }
		              // ----------------------------------------------------------------

	                  viewModeText.style.display = 'inline-block'; 
                      viewModeText.style.visibility = 'visible';
			                
			          // 編集モードを非表示
			          editModeSelect.style.display = 'none';
                      editModeSelect.style.visibility = 'hidden';
			          alert('来館状況と対応完了時刻の更新に成功しました！');
			          })
			          .catch(error => {
			              console.error('来館状況の更新エラー:', error);
			             alert('更新に失敗しました。詳細はコンソールを確認してください。');
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

	    // 2. 現在のセルがどのリストかによってボタンのセレクタを決定
	    let updateClass;
	    let cancelClass;
	    let apiPath;
	    let recordIdAttribute; // 行からIDを取得するための属性名
	    
	    if (row.closest('#content1')) {
	        // 駐車場リスト
	        updateClass = '.update-remarks-button';
	        cancelClass = '.cancel-remarks-button';
	        apiPath = '/api/parking/update';
	        recordIdAttribute = 'data-parking-id';
	    } else if (row.closest('#content2')) {
	        // 来館者リスト
	        updateClass = '.update-remarks-button-visit';
	        cancelClass = '.cancel-remarks-button-visit';
	        apiPath = '/api/visitor/update';
	        recordIdAttribute = 'data-visit-id';
	    } else if (row.closest('#content3')) {
	        // 送迎バスリスト
	        updateClass = '.update-remarks-button'; // (content1と共有)
	        cancelClass = '.cancel-remarks-button'; // (content1と共有)
	        apiPath = '/api/bus/update'; 
	        // 送迎バスの場合、IDはセルの属性 (data-record-id) にあると判断
	        recordIdAttribute = 'data-record-id'; 
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
	        
	        // IDの取得 (バスリストのみセルから、その他は行から)
	        let finalRecordId = (recordIdAttribute === 'data-record-id') ? field.getAttribute(recordIdAttribute) : row.getAttribute(recordIdAttribute);
	        
	        const fieldName = 'remarksColumn';
	        
	        sendUpdateToServer(apiPath, finalRecordId, fieldName, newRemarks)
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
	                if (updateTimeField) {
	                    updateTimeField.textContent = formatDate(new Date()); 
	                }
	                
	                alert('備考欄を更新しました！');
	            })
	            .catch(error => {
	                console.error('備考欄の更新エラー:', error);
	                alert('更新に失敗しました。詳細はコンソールを確認してください。');
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

}); // DOMContentLoaded の閉じ