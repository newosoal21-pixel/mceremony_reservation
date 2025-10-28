/**
 * parking.js
 * * 駐車場リスト (#content1) の機能とロジック
 * * 依存: common.js (sendUpdateToServer, formatDate, showNotificationToast/showNotification)
 * * 依存: visitor.js/common.js (highlightCellAndId)
 * * 修正点: 更新成功時に highlightCellAndId(cell) を呼び出すように変更し、sendUpdateToServer への row の受け渡しを削除。
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: parking.js の実行が開始されました。"); 

    // 固定フィールドの結果ID (common.jsの showNotification に渡すタブID)
    const TARGET_TAB_ID = 'tab1'; 
    
    // ------------------------------------------------------------------
    // 💡 visitor.jsと同じハイライト処理を呼び出すヘルパー
    // ------------------------------------------------------------------
    function triggerCellHighlight(cell) {
        // highlightCellAndId は visitor.js で定義され、グローバルに公開されていると想定
        if (typeof highlightCellAndId === 'function') {
            highlightCellAndId(cell);
        } else {
            console.warn("visitor.js/common.js の highlightCellAndId 関数が見つかりません。");
        }
    }


    // ------------------------------------------------------------------
    // --- 3. 駐車証No.と駐車位置 (content1) の処理 ---
    // ------------------------------------------------------------------
    const permitCells = document.querySelectorAll('#content1 .js-permit-number, #content1 .js-permit-location');

    permitCells.forEach((cell, index) => {
        // ... DOM構築ロジックは省略 ...
        if (cell.querySelector('.edit-mode')) { return; }
        
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; 
        cell.style.position = 'relative';

        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue || '-'; 
        textSpan.className = 'permit-number-text'; 
        textSpan.style.display = 'inline-block'; 
        textSpan.style.visibility = 'visible';
        cell.appendChild(textSpan);
        
        // 編集モード関連のDOM要素の取得または作成 (省略)
        const editWrapper = cell.querySelector('.edit-mode') || document.createElement('div');
        editWrapper.className = 'edit-mode';
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa'; 
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.display = 'none'; 
        editWrapper.style.visibility = 'hidden';

        const selectElement = editWrapper.querySelector('.permit-select') || document.createElement('select');
        selectElement.className = 'permit-select'; 
        // オプションの生成ロジックは省略
        if (selectElement.options.length === 0) {
             for (let i = 1; i <= 24; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                selectElement.appendChild(option);
            }
            editWrapper.appendChild(selectElement);
        }

        const updateButton = editWrapper.querySelector('.update-button') || document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.className = 'update-button'; 
        if (!updateButton.parentElement) editWrapper.appendChild(updateButton);
        
        const cancelButton = editWrapper.querySelector('.cancel-button') || document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'cancel-button'; 
        if (!cancelButton.parentElement) editWrapper.appendChild(cancelButton);

        if (!editWrapper.parentElement) cell.appendChild(editWrapper);


        // <td>クリック (編集モードへ切り替え)
        cell.addEventListener('click', function(e) {
            e.stopPropagation(); 
            if (editWrapper.style.display !== 'none' || editWrapper.contains(e.target)) { return; }
            const currentValue = cell.getAttribute('data-value') || (textSpan.textContent === '-' ? '' : textSpan.textContent);
            selectElement.value = currentValue;
            textSpan.style.display = 'none';
            textSpan.style.visibility = 'hidden';
            editWrapper.style.display = 'flex'; 
            editWrapper.style.visibility = 'visible';
            selectElement.focus(); 
        });

		// 更新ボタンが押されたとき
		updateButton.addEventListener('click', function(e) {
		    e.stopPropagation(); 
		    const newValue = selectElement.value; 
		    const newText = selectElement.options[selectElement.selectedIndex].textContent;
		    const row = cell.closest('tr'); // rowを取得
		    const parkingId = row.getAttribute('data-parking-id'); 
		            
		    let fieldName;
            let fieldNameJp;
		    if (cell.classList.contains('js-permit-number')) {
		        fieldName = 'parkingPermit'; 
                fieldNameJp = '駐車証No.';
		    } else if (cell.classList.contains('js-permit-location')) {
		        fieldName = 'parkingPosition'; 
                fieldNameJp = '駐車位置';
		    } else {
		        console.error("更新対象のフィールドを特定できません。");
		           return; 
		    }

		    // 🔴 修正適用: row を削除
		    sendUpdateToServer('/api/parking/update', parkingId, fieldName, newValue, null, null, TARGET_TAB_ID) 
		          .then(() => {
		          // 💡 common.js の sendUpdateToServer は成功通知のみ行う。DOM更新はここで実行
		          textSpan.textContent = newText;
		          cell.setAttribute('data-value', newValue); 
		          
		          textSpan.style.display = 'inline-block'; 
		          textSpan.style.visibility = 'visible';
		                
		          editWrapper.style.display = 'none';
                  editWrapper.style.visibility = 'hidden';
                  
                  // 🔴 修正適用: highlightCellAndId を呼び出す
                  triggerCellHighlight(cell);

		          })
		          .catch(error => {
		              console.error('更新エラー:', error);
		              const errorMessage = '更新に失敗しました。詳細はコンソールを確認してください。';
                      
                      // 🔴 修正適用: グローバル関数で通知
                      if (typeof showNotification === 'function') {
                          showNotification(errorMessage, 'error', TARGET_TAB_ID); 
                      }
                      if (typeof showNotificationToast === 'function') {
                          showNotificationToast(errorMessage, 'error'); 
                      }
		          });
		});
		
		// 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            editWrapper.style.display = 'none';
            editWrapper.style.visibility = 'hidden';
            textSpan.style.display = 'inline-block'; 
            textSpan.style.visibility = 'visible';
            
            const originalVal = cell.getAttribute('data-value') || textSpan.textContent;
            selectElement.value = originalVal;
        });
        
    });


	// ------------------------------------------------------------------
	// --- 4. 駐車場利用状況 (content1) の処理 ---
	// ------------------------------------------------------------------
	const parkingStatusCells = document.querySelectorAll('#content1 .js-parking-status');
	
	const EXITED_STATUS_ID = '3';       
	const TEMP_EXIT_STATUS_ID = '5';    

	parkingStatusCells.forEach((cell, index) => {
	    const textSpan = cell.querySelector('.view-mode-text');
	    const editWrapper = cell.querySelector('.edit-mode-select');
	    const selectElement = cell.querySelector('.situation-select'); 
	    const updateButton = cell.querySelector('.js-update-button');
	    const cancelButton = cell.querySelector('.js-cancel-button');
	    
        cell.style.position = 'relative';

	    if (!textSpan || !editWrapper || !selectElement || !updateButton || !cancelButton) {
	        console.error("駐車場利用状況の更新に必要なHTML要素が見つかりません。", cell);
	        return; 
	    }
        
        // 編集モードのスタイル調整 (省略)
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa'; 
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.whiteSpace = 'nowrap'; 
        editWrapper.style.display = 'none'; 
        editWrapper.style.visibility = 'hidden';

	    // <td>クリック (編集モードへ切り替え)
	    cell.addEventListener('click', function(e) {
	        e.stopPropagation(); 
	        if (editWrapper.style.display !== 'none' || editWrapper.contains(e.target)) { return; }
	        const currentStatusId = cell.getAttribute('data-status-id'); 
	        selectElement.value = currentStatusId; 
			textSpan.style.display = 'none';
            textSpan.style.visibility = 'hidden';
			editWrapper.style.display = 'flex'; 
            editWrapper.style.visibility = 'visible';
			selectElement.focus(); 
	    });

		// 更新ボタンが押されたとき
		updateButton.addEventListener('click', function(e) {
		    e.stopPropagation(); 
		        
		    const newValueId = selectElement.value; 
		    const newTextName = selectElement.options[selectElement.selectedIndex].textContent; 
		    const row = cell.closest('tr'); // rowを取得
		    const parkingId = row.getAttribute('data-parking-id'); 
		    const fieldName = updateButton.getAttribute('data-field-name'); 

              // ----------------------------------------------------------------
              // 🔴 成功時の時刻更新ロジック (出庫時刻/更新日時)
              // ----------------------------------------------------------------
              const currentTime = new Date();
              const formattedTime = formatDate(currentTime);
              
              let extraField = null;
              let extraValue = null;

              if (newValueId === EXITED_STATUS_ID || newValueId === TEMP_EXIT_STATUS_ID) {
                  extraField = 'departureTime'; 
                  extraValue = formattedTime;
              } else if (newValueId !== EXITED_STATUS_ID && newValueId !== TEMP_EXIT_STATUS_ID) {
                  extraField = 'departureTime';
                  extraValue = ''; 
              }
              // ----------------------------------------------------------------
              
		    // 🔴 修正適用: row を削除
		    sendUpdateToServer('/api/parking/update', parkingId, fieldName, newValueId, extraField, extraValue, TARGET_TAB_ID)
		          .then(() => {
		            
		              const updateTimeField = row.querySelector('.js-update-time-field');
		              const exitTimeField = row.querySelector('.js-exit-time-field');
		              
		              // 利用状況のテキスト（表示）を更新
		              textSpan.textContent = newTextName;
		              cell.setAttribute('data-status-id', newValueId); 

		              // 時刻フィールドの更新 (common.jsの sendUpdateToServer は DOM 更新は行わないため、ここで実行)
		              if (newValueId === EXITED_STATUS_ID || newValueId === TEMP_EXIT_STATUS_ID) {
		                  if (exitTimeField) { exitTimeField.textContent = formattedTime; }
		                  // サーバーから返された updateTime を使うのが理想だが、ここでは formattedTime を代用
		                  if (updateTimeField) { updateTimeField.textContent = formattedTime; } 
		              } else {
		                  // サーバーから返された updateTime を使うのが理想だが、ここでは formattedTime を代用
		                  if (updateTimeField) { updateTimeField.textContent = formattedTime; }
		                  if (exitTimeField) { exitTimeField.textContent = ''; }
		              }
		              // ----------------------------------------------------------------

	                  textSpan.style.display = 'inline-block'; 
                      textSpan.style.visibility = 'visible';
			          editWrapper.style.display = 'none';
                      editWrapper.style.visibility = 'hidden';
                      
                      // 🔴 修正適用: highlightCellAndId を呼び出す
                      triggerCellHighlight(cell);
			          })
			          .catch(error => {
			              console.error('利用状況の更新エラー:', error);
			              const errorMessage = '利用状況の更新に失敗しました。詳細はコンソールを確認してください。';
                          
                          // 🔴 修正適用: グローバル関数で通知
                          if (typeof showNotification === 'function') {
                              showNotification(errorMessage, 'error', TARGET_TAB_ID); 
                          }
                          if (typeof showNotificationToast === 'function') {
                              showNotificationToast(errorMessage, 'error'); 
                          }
			          });
		});
		
		// キャンセルボタンの処理（DOMを元に戻す）
	    cancelButton.addEventListener('click', function(e) {
	         e.stopPropagation(); 
	         editWrapper.style.display = 'none';
             editWrapper.style.visibility = 'hidden';
	         textSpan.style.display = 'inline-block';
             textSpan.style.visibility = 'visible';
             const originalStatusId = cell.getAttribute('data-status-id'); 
             selectElement.value = originalStatusId;
	    });
	});

	// ------------------------------------------------------------------
	// --- 5. 車両ナンバー (content1) の処理 ---
	// ------------------------------------------------------------------
	const vehicleNumberFields = document.querySelectorAll('#content1 .js-vehicle-number-field');

	vehicleNumberFields.forEach(cell => {
	    const textSpan = cell.querySelector('.vehicle-number-text');
	    const form = cell.querySelector('.vehicle-number-edit-form'); 
	    
	    if (!textSpan || !form) { return; }
	    
	    const inputField = form.querySelector('.vehicle-number-input');
	    const updateButton = form.querySelector('.update-vehicle-button');
	    const cancelButton = form.querySelector('.cancel-vehicle-button'); 

	    if (!inputField || !updateButton || !cancelButton) { return; }
	    
	    form.style.display = 'none';
	    form.style.visibility = 'hidden';
	    
	    // <td>クリック (編集モードへ切り替え)
	    cell.addEventListener('click', function(e) {
	         e.stopPropagation();
	         // 編集前の値を data-original-value 属性から取得 (ESCキー処理用)
             const originalValue = textSpan.getAttribute('data-original-value') || textSpan.textContent.trim();
	         inputField.value = originalValue;
	         textSpan.style.display = 'none';
	         textSpan.style.visibility = 'hidden';
	         form.style.display = 'block'; 
	         form.style.visibility = 'visible';
	         inputField.focus(); 
	    });

	    // 更新ボタンのイベントリスナー (AJAX処理)
	    updateButton.addEventListener('click', function(e) {
	        e.preventDefault(); 
	        e.stopPropagation();
	        
	        const newNumber = inputField.value;
	        const row = cell.closest('tr'); // rowを取得
	        const recordId = row.getAttribute('data-parking-id');
	        
	        // 🔴 修正適用: row を削除
	        sendUpdateToServer('/api/parking/update', recordId, 'carNumber', newNumber, null, null, TARGET_TAB_ID) 
	             .then(() => {
	                
	                const updateTimeField = row.querySelector('.js-update-time-field');
	                const formattedTime = formatDate(new Date());
	                
	                textSpan.textContent = newNumber;
	                textSpan.setAttribute('data-original-value', newNumber); 
	                
	                // サーバーから返された updateTime を使うのが理想だが、ここでは formattedTime を代用
	                if (updateTimeField) {
	                    updateTimeField.textContent = formattedTime;
	                }
	                
	                textSpan.style.display = 'inline-block';
	                textSpan.style.visibility = 'visible';
	                form.style.display = 'none';
	                form.style.visibility = 'hidden';
                    
	                // 🔴 修正適用: highlightCellAndId を呼び出す
                    triggerCellHighlight(cell);
	             })
	             .catch(error => {
	                 console.error('車両ナンバーの更新エラー:', error);
	                 const errorMessage = '車両ナンバーの更新に失敗しました。詳細はコンソールを確認してください。';

                     // 🔴 修正適用: グローバル関数で通知
                     if (typeof showNotification === 'function') {
                          showNotification(errorMessage, 'error', TARGET_TAB_ID); 
                     }
                     if (typeof showNotificationToast === 'function') {
                          showNotificationToast(errorMessage, 'error'); 
                     }
	                 inputField.value = textSpan.textContent.trim();
	             });
	    });

	    // 取消ボタンのイベントリスナー
	    cancelButton.addEventListener('click', function(e) {
	        e.stopPropagation(); 
            // 編集前の値に戻す
            const originalValue = textSpan.getAttribute('data-original-value') || textSpan.textContent.trim();
	        inputField.value = originalValue;
	        form.style.display = 'none';
	        form.style.visibility = 'hidden';
	        textSpan.style.display = 'inline-block';
	        textSpan.style.visibility = 'visible';
	    });
	});
    
	// ------------------------------------------------------------------
	// --- 6. 備考欄 (content1) の処理 ---
	// ------------------------------------------------------------------
	const remarksFields = document.querySelectorAll('#content1 .js-remarks-field');

	remarksFields.forEach(cell => {
	    const textSpan = cell.querySelector('.remarks-text');
	    const form = cell.querySelector('.remarks-edit-form'); 
	    
	    if (!textSpan || !form) { return; }
	    
	    const textarea = form.querySelector('.remarks-textarea');
	    const updateButton = form.querySelector('.update-remarks-button');
	    const cancelButton = form.querySelector('.cancel-remarks-button'); 

	    if (!textarea || !updateButton || !cancelButton) { return; }

	    form.style.display = 'none';
	    form.style.visibility = 'hidden';
	    
	    // <td>クリック (編集モードへ切り替え)
	    cell.addEventListener('click', function(e) {
	         e.stopPropagation();
             // 編集前の値を data-original-value 属性から取得 (ESCキー処理用)
             const originalValue = textSpan.getAttribute('data-original-value') || textSpan.textContent.trim();
	         textarea.value = originalValue;
	         textSpan.style.display = 'none';
	         textSpan.style.visibility = 'hidden';
	         form.style.display = 'block'; 
	         form.style.visibility = 'visible';
	         textarea.focus(); 
	    });

	    // 更新ボタンのイベントリスナー (AJAX処理)
	    updateButton.addEventListener('click', function(e) {
	        e.preventDefault(); 
	        e.stopPropagation();
	        
	        const newRemarks = textarea.value;
	        const row = cell.closest('tr'); // rowを取得
	        const recordId = row.getAttribute('data-parking-id'); // parkingリストのIDを取得
	        
	        // 🔴 修正適用: row を削除
	        sendUpdateToServer('/api/parking/update', recordId, 'remarksColumn', newRemarks, null, null, TARGET_TAB_ID) 
	             .then(() => {
	                
	                const updateTimeField = row.querySelector('.js-update-time-field');
	                const formattedTime = formatDate(new Date());
	                
	                // 表示内容の更新
	                textSpan.textContent = newRemarks;
	                textSpan.setAttribute('data-original-value', newRemarks); 
	                
	                // 更新日時の更新
	                // サーバーから返された updateTime を使うのが理想だが、ここでは formattedTime を代用
	                if (updateTimeField) {
	                    updateTimeField.textContent = formattedTime;
	                }
	                
	                // 表示モードを再表示
	                textSpan.style.display = 'inline-block';
	                textSpan.style.visibility = 'visible';
	                // 編集モードを非表示
	                form.style.display = 'none';
	                form.style.visibility = 'hidden';
	                
	                // 🔴 修正適用: highlightCellAndId を呼び出す
                    triggerCellHighlight(cell);
	             })
	             .catch(error => {
	                 console.error('備考欄の更新エラー:', error);
	                 const errorMessage = '備考欄の更新に失敗しました。詳細はコンソールを確認してください。';

                     // 🔴 修正適用: グローバル関数で通知
                     if (typeof showNotification === 'function') {
                          showNotification(errorMessage, 'error', TARGET_TAB_ID); 
                     }
                     if (typeof showNotificationToast === 'function') {
                          showNotificationToast(errorMessage, 'error'); 
                     }
	                 textarea.value = textSpan.textContent.trim(); // 元の値に戻す
	             });
	    });

	    // 取消ボタンのイベントリスナー
	    cancelButton.addEventListener('click', function(e) {
	        e.stopPropagation(); 
            // 編集前の値に戻す
            const originalValue = textSpan.getAttribute('data-original-value') || textSpan.textContent.trim();
	        textarea.value = originalValue;
	        form.style.display = 'none';
	        form.style.visibility = 'hidden';
	        textSpan.style.display = 'inline-block';
	        textSpan.style.visibility = 'visible';
	    });
	});

}); // DOMContentLoaded の閉じ