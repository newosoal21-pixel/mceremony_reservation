document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------------------------------------
    // --- 0. グローバル変数/初期設定 ---
    // ------------------------------------------------------------------
    // CSRFトークンを取得 (HTMLの<meta>タグに埋め込まれている前提)
    const csrfTokenMeta = document.querySelector('meta[name="_csrf"]');
    const csrfHeaderMeta = document.querySelector('meta[name="_csrf_header"]');
    
    // トークンがなければ空文字を設定（開発環境やセキュリティ無効時用）
    const csrfToken = csrfTokenMeta ? csrfTokenMeta.content : '';
    const csrfHeader = csrfHeaderMeta ? csrfHeaderMeta.content : '';
    
    // ロール情報を取得 (管理者/一般ユーザーの制御用)
    const body = document.querySelector('body');
    const userRole = body.getAttribute('data-user-role');
    const isAdmin = userRole === 'ADMIN';

    // ------------------------------------------------------------------
    // --- AJAX関数 ---
    // ------------------------------------------------------------------
    /**
     * サーバーに更新リクエストを送信する汎用関数
     * @param {string} id - レコードID
     * @param {string} field - 更新対象のフィールド名 (例: 'carNumber', 'parkingStatus')
     * @param {string} value - 新しい値
     * @returns {Promise<any>}
     */
    function sendUpdateToServer(id, field, value) {
       // リクエストヘッダーを設定
       const headers = {
           'Content-Type': 'application/json',
       };
       // CSRFトークンがあればヘッダーに追加
       if (csrfHeader && csrfToken) {
           headers[csrfHeader] = csrfToken;
       }
       
       // 備考欄の更新は元のコードのロジックに合わせるため、ここでは統一のエンドポイントを使用
       return fetch('/api/parking/update', { 
           method: 'POST',
           headers: headers,
           body: JSON.stringify({
               id: id,
            field: field,
            value: value
             })
           })
            .then(response => {
                if (!response.ok) {
                    // サーバーエラー（4xx, 5xx）の処理
                    return response.json().then(err => { 
                        throw new Error(err.message || 'サーバーエラー (' + response.status + '): 権限またはデータエラー'); 
                    }).catch(() => {
                        // JSONパース失敗時 (403や500がHTMLを返すことがある)
                        throw new Error('サーバーエラー (' + response.status + ')：認証またはセキュリティの問題の可能性があります。');
                    });
                }
                return response.json(); 
            });
    }
    // ------------------------------------------------------------------


    // ------------------------------------------------------------------
    // --- 1. 駐車証No.と駐車位置 (content1) の処理 ---
    // ------------------------------------------------------------------
    const permitCells = document.querySelectorAll('#content1 .js-permit-number, #content1 .js-permit-location');

    permitCells.forEach((cell, index) => {
        if (cell.querySelector('.edit-mode')) { return; }
        
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; 
        cell.style.position = 'relative';

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue || '-'; 
        textSpan.className = 'permit-number-text'; 
        textSpan.style.display = 'inline-block'; 
        textSpan.style.visibility = 'visible';
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン + 取消ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode';
        editWrapper.setAttribute('data-original-value', originalValue);
        
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa'; 
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.display = 'none'; // 初期状態は非表示
        editWrapper.style.visibility = 'hidden';

        const selectElement = document.createElement('select');
        selectElement.name = `parking_permit_or_location_${index + 1}`; 
        selectElement.className = 'permit-select'; 
        
        // オプションの作成 (1から24)
        for (let i = 1; i <= 24; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            selectElement.appendChild(option);
        }
        editWrapper.appendChild(selectElement);

        // 更新ボタン
        const updateButton = document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.className = 'update-button'; 
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);
        
        // 取消ボタン
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'cancel-button'; 
        cancelButton.style.marginLeft = '5px';
        cancelButton.style.fontSize = '11px';
        cancelButton.style.padding = '2px 5px';
        cancelButton.style.cursor = 'pointer';
        editWrapper.appendChild(cancelButton); 

        cell.appendChild(editWrapper);

        // ==========================================================
        // 3. イベントリスナー（クリックと更新処理）
        // ==========================================================
        
        // <td>クリック (編集モードへ切り替え)
        cell.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            if (!isAdmin) {
                 console.log("一般ユーザーは駐車証No./駐車位置を変更できません。");
                 return; 
            }

            if (editWrapper.style.display !== 'none' || editWrapper.contains(e.target)) {
                return;
            }

            const currentValue = cell.getAttribute('data-value') || (textSpan.textContent === '-' ? '' : textSpan.textContent);
            selectElement.value = currentValue;
        
            // 表示モードを非表示
            textSpan.style.display = 'none';
            textSpan.style.visibility = 'hidden';
            
            // 編集モードを表示
            editWrapper.style.display = 'inline-flex';
            editWrapper.style.visibility = 'visible';
            selectElement.focus(); 
        });

		// 更新ボタンが押されたとき (編集 -> 表示 & AJAX POST処理)
		updateButton.addEventListener('click', function(e) {
		    e.stopPropagation(); 
		        
		    const newValue = selectElement.value; 
		    const newText = selectElement.options[selectElement.selectedIndex].textContent;
		            
		    const parkingId = cell.closest('tr').getAttribute('data-parking-id'); 
		            
		    let fieldName;
		    if (cell.classList.contains('js-permit-number')) {
		        fieldName = 'parkingPermit'; 
		    } else if (cell.classList.contains('js-permit-location')) {
		        fieldName = 'parkingPosition'; 
		    } else {
		        console.error("更新対象のフィールドを特定できません。");
		           return; 
		    }

		    sendUpdateToServer(parkingId, fieldName, newValue)
		          .then(() => {
		          // 成功した場合のみDOMを更新
		          textSpan.textContent = newText;
		          cell.setAttribute('data-value', newValue); 
		          
		          textSpan.style.display = 'inline-block'; 
		          textSpan.style.visibility = 'visible';
		                
		          // 編集モードを非表示
		          editWrapper.style.display = 'none';
                  editWrapper.style.visibility = 'hidden';
		          alert('更新に成功しました！');
		          })
		          .catch(error => {
		              console.error('更新エラー:', error);
		              alert('更新に失敗しました。詳細はコンソールを確認してください。');
		          });
		});
		
		// 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            // 編集モードを非表示
            editWrapper.style.display = 'none';
            editWrapper.style.visibility = 'hidden';
            // 表示モードを再表示
            textSpan.style.display = 'inline-block'; 
            textSpan.style.visibility = 'visible';
            
            // 編集前の値に戻す
            const originalVal = cell.getAttribute('data-value') || textSpan.textContent;
            selectElement.value = originalVal;
        });
        
    });


	// ------------------------------------------------------------------
	    // --- 2. 駐車場利用状況 (content1) の処理 ---
	    // ------------------------------------------------------------------
	    const parkingStatusCells = document.querySelectorAll('#content1 .js-parking-status');
	    
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
            
            // 編集モードのスタイル調整
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

	        // ==========================================================
	        // 3. イベントリスナー（クリックと更新処理）
	        // ==========================================================
	        
	        // <td>クリック (編集モードへ切り替え)
	        cell.addEventListener('click', function(e) {
	            e.stopPropagation(); 
	            
                if (!isAdmin) { return; } // 管理者制限

	            if (editWrapper.style.display !== 'none' || editWrapper.contains(e.target)) {
	                return;
	            }

	            const currentStatusId = cell.getAttribute('data-status-id'); 
	            selectElement.value = currentStatusId; 
	        
				// 表示モードを非表示
				textSpan.style.display = 'none';
                textSpan.style.visibility = 'hidden';

				// 編集モードを表示
				editWrapper.style.display = 'inline-flex'; 
                editWrapper.style.visibility = 'visible';

				selectElement.focus(); 
	        });

			// 更新ボタンが押されたとき (編集 -> 表示 & AJAX POST処理)
			updateButton.addEventListener('click', function(e) {
			    e.stopPropagation(); 
			        
			    const newValueId = selectElement.value; 
			    const newTextName = selectElement.options[selectElement.selectedIndex].textContent; 
			            
			    const parkingId = cell.closest('tr').getAttribute('data-parking-id'); 
			    const fieldName = updateButton.getAttribute('data-field-name'); 

			    sendUpdateToServer(parkingId, fieldName, newValueId)
			          .then(() => {
			          // 成功した場合のみDOMを更新
			          textSpan.textContent = newTextName;
			          cell.setAttribute('data-status-id', newValueId); 
	                  
	                  textSpan.style.display = 'inline-block'; 
                      textSpan.style.visibility = 'visible';
			                
			          // 編集モードを非表示
			          editWrapper.style.display = 'none';
                      editWrapper.style.visibility = 'hidden';
			            alert('利用状況の更新に成功しました！');
			          })
			            .catch(error => {
			              console.error('利用状況の更新エラー:', error);
			             alert('更新に失敗しました。詳細はコンソールを確認してください。');
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
		// --- 3. 車両ナンバー (content1) の処理 (最終修正) ---
		// ------------------------------------------------------------------
		const vehicleNumberFields = document.querySelectorAll('#content1 .js-vehicle-number-field');

		vehicleNumberFields.forEach(cell => {
		    const textSpan = cell.querySelector('.vehicle-number-text');
		    
		    // フォーム要素の取得: HTMLに合わせ .vehicle-number-edit-form を使用
		    const form = cell.querySelector('.vehicle-number-edit-form'); 
		    
		    // 安全チェック: 必須要素がない場合はスキップし、次の要素へ
		    if (!textSpan || !form) {
		         console.error("車両ナンバーフィールドの必須要素が見つかりません。", cell);
		         return; 
		    }
		    
		    // フォーム内の要素を取得 (formがnullでないことは確認済み)
		    const inputField = form.querySelector('.vehicle-number-input');
		    const updateButton = form.querySelector('.update-vehicle-button');
		    const cancelButton = form.querySelector('.cancel-vehicle-button'); // HTMLにあるので取得

		    if (!inputField || !updateButton || !cancelButton) {
		        console.error("車両ナンバーフォーム内の必須ボタンまたは入力欄が見つかりません。", form);
		        return; 
		    }
		    
		    // フォームを確実に非表示に設定
		    form.style.display = 'none';
		    form.style.visibility = 'hidden';
		    
		    // <td>クリック (編集モードへ切り替え)
		    cell.addEventListener('click', function(e) {
		         e.stopPropagation();
		        
		         if (!isAdmin) { return; } 

		         if (form.style.display !== 'none' || form.contains(e.target)) {
		             return;
		         }
		        
		         // 現在の表示値を入力フィールドにセット
		         inputField.value = textSpan.textContent.trim();
		        
		         textSpan.style.display = 'none';
		         textSpan.style.visibility = 'hidden';
		        
		         form.style.display = 'flex'; 
		         form.style.visibility = 'visible';
		         inputField.focus(); 
		    });

		    // 更新ボタンのイベントリスナー (AJAX処理)
		    updateButton.addEventListener('click', function(e) {
		        e.preventDefault(); 
		        e.stopPropagation();
		        
		        const newNumber = inputField.value;
		        const recordId = cell.closest('tr').getAttribute('data-parking-id');
		        
		        sendUpdateToServer(recordId, 'carNumber', newNumber)
		             .then(() => {
		                // 成功
		                textSpan.textContent = newNumber;
		                textSpan.setAttribute('data-original-value', newNumber); 
		                
		                // 表示モードを再表示
		                textSpan.style.display = 'inline-block';
		                textSpan.style.visibility = 'visible';
		                // 編集モードを非表示
		                form.style.display = 'none';
		                form.style.visibility = 'hidden';
		                alert('車両ナンバーを更新しました！');
		             })
		             .catch(error => {
		                 console.error('車両ナンバーの更新エラー:', error);
		                 alert('更新に失敗しました。詳細はコンソールを確認してください。');
		                 
		                 // 失敗した場合、元の値に戻す（今回は textSpan のtextContentを元の値とする）
		                 inputField.value = textSpan.textContent.trim();
		             });
		    });

		    // 取消ボタンのイベントリスナー
		    cancelButton.addEventListener('click', function(e) {
		        e.stopPropagation(); 
		        
		        // 入力値を編集前の値に戻す
		        inputField.value = textSpan.textContent.trim();
		        
		        // 編集モードを非表示に戻す
		        form.style.display = 'none';
		        form.style.visibility = 'hidden';
		        // 表示モードに戻す
		        textSpan.style.display = 'inline-block';
		        textSpan.style.visibility = 'visible';
		    });
		});

    // ------------------------------------------------------------------
    // --- 4. 来館状況 (content2) の処理 ---
    // ------------------------------------------------------------------
    const situationCells = document.querySelectorAll('#content2 .js-visit-situation');

    const situations = [
        '来館前',
        '案内済',
        '退館済',
        'キャンセル'
    ];

    situationCells.forEach((cell, index) => {
        if (cell.querySelector('.situation-text')) { return; }
        
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; 
        cell.style.position = 'relative';

        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue;
        textSpan.className = 'situation-text';
        textSpan.style.display = 'inline-block';
        textSpan.style.visibility = 'visible';
        
        cell.appendChild(textSpan);

        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode'; 
        editWrapper.setAttribute('data-original-value', originalValue);
        
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa';
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.display = 'none'; 
        editWrapper.style.visibility = 'hidden';

        const selectElement = document.createElement('select');
        selectElement.name = `visit_situation_${index + 1}`; 
        selectElement.className = 'situation-select'; 

        situations.forEach(situation => {
            const option = document.createElement('option');
            option.value = situation;
            option.textContent = situation;
            selectElement.appendChild(option);
        });
        editWrapper.appendChild(selectElement);

        const updateButton = document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.className = 'update-button'; 
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'cancel-button'; 
        cancelButton.style.marginLeft = '5px';
        cancelButton.style.fontSize = '11px';
        cancelButton.style.padding = '2px 5px';
        cancelButton.style.cursor = 'pointer';
        editWrapper.appendChild(cancelButton); 

        cell.appendChild(editWrapper);

        // <td>クリック (編集モードへ切り替え)
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (editWrapper.style.display !== 'none' || editWrapper.contains(e.target)) {
                return;
            }

            const currentValue = textSpan.textContent;
            selectElement.value = currentValue;
            
            // 表示モードを非表示
            textSpan.style.display = 'none';
            textSpan.style.visibility = 'hidden';

            // 編集モードを表示
            editWrapper.style.display = 'inline-flex';
            editWrapper.style.visibility = 'visible';
            selectElement.focus();
        });

        // 更新ボタンが押されたとき (編集 -> 表示)
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            const newValue = selectElement.value;
            
            // サーバー処理を省略し、DOMを直接更新するダミー処理
            textSpan.textContent = newValue;
            cell.setAttribute('data-value', newValue);
            
            // 編集モードを非表示
            editWrapper.style.display = 'none';
            editWrapper.style.visibility = 'hidden';
            // 表示モードを再表示
            textSpan.style.display = 'inline-block';
            textSpan.style.visibility = 'visible';
            
            alert(`来館状況を ${newValue} に更新しました (ダミー処理)`);
        });
        
        // 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
             e.stopPropagation(); 
             editWrapper.style.display = 'none';
             editWrapper.style.visibility = 'hidden';
             textSpan.style.display = 'inline-block';
             textSpan.style.visibility = 'visible';
             selectElement.value = textSpan.textContent; 
        });
        
        // セレクトボックスの選択が変更されたら、更新ボタンをクリックする
        selectElement.addEventListener('change', function() {
            updateButton.click();
        });
    });

    // ------------------------------------------------------------------
    // --- 5. 送迎バス入出庫状況 (content3) の処理 ---
    // ------------------------------------------------------------------
    const busStatusCells = document.querySelectorAll('#content3 .js-bus-status');

    const busStatuses = [
        '到着前',
        '到着済',
        '下車出発済',
        '乗車出発済',
        'キャンセル'
    ];

    busStatusCells.forEach((cell, index) => {
        if (cell.querySelector('.situation-text')) { return; }
        
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; 
        cell.style.position = 'relative';

        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue;
        textSpan.className = 'situation-text';
        textSpan.style.display = 'inline-block';
        textSpan.style.visibility = 'visible';
        
        cell.appendChild(textSpan);

        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode'; 
        editWrapper.setAttribute('data-original-value', originalValue);
        
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa';
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.display = 'none';
        editWrapper.style.visibility = 'hidden';

        const selectElement = document.createElement('select');
        selectElement.name = `bus_status_${index + 1}`; 
        selectElement.className = 'bus-status-select'; 

        busStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            selectElement.appendChild(option);
        });
        editWrapper.appendChild(selectElement);

        const updateButton = document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.className = 'update-button'; 
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'cancel-button'; 
        cancelButton.style.marginLeft = '5px';
        cancelButton.style.fontSize = '11px';
        cancelButton.style.padding = '2px 5px';
        cancelButton.style.cursor = 'pointer';
        editWrapper.appendChild(cancelButton); 
        
        cell.appendChild(editWrapper);

        // 左クリック (click) イベントのリスナー
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            if (editWrapper.style.display !== 'none' || editWrapper.contains(e.target)) {
                return;
            }

            const currentValue = textSpan.textContent;
            selectElement.value = currentValue;
            
            textSpan.style.display = 'none';
            textSpan.style.visibility = 'hidden';
            editWrapper.style.display = 'inline-flex';
            editWrapper.style.visibility = 'visible';
            selectElement.focus();
        });

        // 更新ボタンが押されたとき (編集 -> 表示)
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            const newValue = selectElement.value;
            textSpan.textContent = newValue;
            cell.setAttribute('data-value', newValue);
            
            editWrapper.style.display = 'none';
            editWrapper.style.visibility = 'hidden';
            textSpan.style.display = 'inline-block';
            textSpan.style.visibility = 'visible';
            
            alert(`入出庫状況を ${newValue} に更新しました (ダミー処理)`);
        });
        
        // 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
             e.stopPropagation(); 
             editWrapper.style.display = 'none';
             editWrapper.style.visibility = 'hidden';
             textSpan.style.display = 'inline-block';
             textSpan.style.visibility = 'visible';
             selectElement.value = textSpan.textContent; 
        });

        // セレクトボックスの選択が変更されたら、更新ボタンをクリックする
        selectElement.addEventListener('change', function() {
            updateButton.click();
        });
    });
    
    // ------------------------------------------------------------------
    // --- 6. 備考欄 (content1, content2, content3) の処理 ---
    // ------------------------------------------------------------------
    const remarksFields = document.querySelectorAll('.js-remarks-field');

    remarksFields.forEach(cell => {
        const textSpan = cell.querySelector('.remarks-text');
        const editForm = cell.querySelector('.remarks-edit-form');
        const textarea = cell.querySelector('.remarks-textarea');
        const updateButton = cell.querySelector('.update-remarks-button');
        
        if (!textSpan || !editForm || !textarea || !updateButton) {
            console.error("備考欄の要素が見つかりません。", cell);
            return;
        }
        
        // フォームを確実に非表示に設定
        editForm.style.display = 'none';
        editForm.style.visibility = 'hidden';
        
        // <td>クリック (編集モードへ切り替え)
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (editForm.style.display !== 'none' || editForm.contains(e.target)) {
                 return;
            }
            
            textarea.value = textSpan.textContent;
            
            // 表示モードを非表示
            textSpan.style.display = 'none';
            textSpan.style.visibility = 'hidden';
            
            // 編集モードを表示
            editForm.style.display = 'flex'; // フォーム内の要素に合わせてflexに変更
            editForm.style.visibility = 'visible';
            textarea.focus(); 
        });

        // 更新ボタンのイベントリスナー
        updateButton.addEventListener('click', function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            
            const newRemarks = textarea.value;
            const recordId = cell.getAttribute('data-record-id');
            const tableType = cell.closest('.content').id;
            
            let fieldName = 'remarksColumn';
            let apiEndpoint;
            
            if (tableType === 'content1') {
                // 駐車場リストは /api/parking/update を使用
                apiEndpoint = '/api/parking/update';
            } else if (tableType === 'content2') {
                // 来館者リスト（ダミーAPI）
                apiEndpoint = '/api/visit/update'; 
            } else if (tableType === 'content3') {
                // 送迎バスリスト（ダミーAPI）
                apiEndpoint = '/api/bus/update'; 
            } else {
                console.error("テーブルタイプを特定できません。");
                return;
            }
            
            // サーバー送信処理（fetchを直接使用, CSRFヘッダーが必要）
            const headers = { 'Content-Type': 'application/json' };
            if (csrfHeader && csrfToken) {
                headers[csrfHeader] = csrfToken;
            }
            
            fetch(apiEndpoint, { 
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    id: recordId,
                    field: fieldName,
                    value: newRemarks
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.message || 'サーバーエラーが発生しました');
                    }).catch(() => {
                        throw new Error('サーバーエラーが発生しました');
                    });
                }
                return response.json(); 
            })
            .then(() => {
                // 成功した場合のみDOMを更新
                textSpan.textContent = newRemarks;
                // 表示モードを再表示
                textSpan.style.display = 'inline-block';
                textSpan.style.visibility = 'visible';
                // 編集モードを非表示
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden';
                alert('備考欄を更新しました！');
            })
            .catch(error => {
                console.error('備考欄の更新エラー:', error);
                alert('更新に失敗しました。詳細はコンソールを確認してください。');
                // 編集前の値に戻す
                textarea.value = textSpan.textContent; 
            });
        });
        
        // 編集モード外をクリックした際の挙動 (document全体にイベントを追加)
        document.addEventListener('click', (e) => {
            if (editForm.style.display !== 'none' && !cell.contains(e.target)) {
                // 編集モードを非表示に戻す
                editForm.style.display = 'none';
                editForm.style.visibility = 'hidden';
                // 表示モードに戻す
                textSpan.style.display = 'inline-block';
                textSpan.style.visibility = 'visible';
                
                // 編集前の値に戻す
                textarea.value = textSpan.textContent;
            }
        });
    });

    // ------------------------------------------------------------------
    // --- 7. グローバルな処理 (ESCキーで編集モードを閉じる) ---
    // ------------------------------------------------------------------
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
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
                        wrapper.style.display = 'none';
                        wrapper.style.visibility = 'hidden';
                    }
                }
            });
        }
    });

});