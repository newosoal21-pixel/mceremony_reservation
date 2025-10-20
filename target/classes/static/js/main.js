document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------------------------------------
    // --- AJAX関数 (ファイルのどこかに追加) ---
    // ------------------------------------------------------------------
    function sendUpdateToServer(id, field, value) {
       return fetch('/api/parking/update', { 
       method: 'POST',
       headers: {
           'Content-Type': 'application/json',
       },
       body: JSON.stringify({
           id: id,
        field: field,
        value: value
         })
       })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message || '不明なサーバーエラー'); });
                }
                return response.json(); 
      });
    }
    // ------------------------------------------------------------------


    // ------------------------------------------------------------------
    // --- 1. 駐車証No.と駐車位置 (content1) の処理 ---
    // ------------------------------------------------------------------
    const permitCells = document.querySelectorAll('#content1 .js-permit-number, #content1 .js-permit-location');

    // 駐車証No.の選択肢リスト (今回はDOM生成に使われないため定義のみ)
    const permitNumber = [
        '1','2','3','4','5','6','7','8','9','10','11','12',
        '13','14','15','16','17','18','19','20','21','22','23','24'
    ];

    permitCells.forEach((cell, index) => {
        // 既に処理済みならスキップ (編集モードのラッパーがあるかどうかで判断)
        if (cell.querySelector('.edit-mode')) { return; }
        
        // 元の値を取得
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; 
        cell.style.position = 'relative'; // ✅ 追加：絶対配置の基準を設定

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue || '-'; 
        textSpan.className = 'permit-number-text'; 
        textSpan.style.display = 'inline-block'; // 初期表示
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン + 取消ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode';
        editWrapper.style.display = 'none'; 
        editWrapper.setAttribute('data-original-value', originalValue); // 元の値を保存
        
        // ✅ 修正/追加：ボタンをデータの下に移動させるスタイル
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa'; 
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.display = 'inline-flex'; // 編集モードの表示スタイルを統一
        
        // 2-1. select要素（プルダウン）の作成
        const selectElement = document.createElement('select');
        selectElement.name = `parking_permit_or_location_${index + 1}`; 
        selectElement.className = 'permit-select'; 
        
        // オプションの作成
        for (let i = 1; i <= 24; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            selectElement.appendChild(option);
        }
        editWrapper.appendChild(selectElement);

        // 2-2. 更新ボタン
        const updateButton = document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.className = 'update-button'; 
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);
        
        // ✅ 2-3. 取消ボタン (追加)
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
            
            if (editWrapper.style.display === 'inline-flex' || editWrapper.contains(e.target)) {
                return;
            }

            // select要素の値を現在の表示値にセット
            const currentValue = cell.getAttribute('data-value') || (textSpan.textContent === '-' ? '' : textSpan.textContent);
            selectElement.value = currentValue;
        
            // 表示モードを非表示
            textSpan.style.display = 'none';
            
            // 編集モードを表示
            editWrapper.style.display = 'inline-flex';
            selectElement.focus(); 
        });

		// 更新ボタンが押されたとき (編集 -> 表示 & ダミーPOST処理)
		updateButton.addEventListener('click', function(e) {
		    e.stopPropagation(); 
		        
		    // 1. 選択された新しい値を取得
		    const newValue = selectElement.value; 
		    const newText = selectElement.options[selectElement.selectedIndex].textContent;
		            
		    // 2. 変更対象のレコードIDと更新するカラム（駐車証No.か駐車位置か）を取得
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

		    // 3. サーバー送信処理を実行（既存の関数 sendUpdateToServer を使用）
		    sendUpdateToServer(parkingId, fieldName, newValue)
		          .then(() => {
		          // 成功した場合のみDOMを更新
		          textSpan.textContent = newText;
		          cell.setAttribute('data-value', newValue); 
		          textSpan.style.display = 'inline-block'; 
		                
		          // 編集モードを非表示
		          editWrapper.style.display = 'none';
		            alert('更新に成功しました！');
		          })
		            .catch(error => {
		              console.error('更新エラー:', error);
		             alert('更新に失敗しました。詳細はコンソールを確認してください。');
		          });
		});
		
		// ✅ 取消ボタンのイベントリスナー (追加)
        cancelButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            editWrapper.style.display = 'none';
            textSpan.style.display = 'inline-block'; 
            
            // 編集前の値に戻す
            const originalVal = cell.getAttribute('data-value') || textSpan.textContent;
            selectElement.value = originalVal;
        });

        // セレクトボックスの選択が変更されたら、更新ボタンをクリックする (コメントアウトを維持)
        selectElement.addEventListener('change', function() {
            // updateButton.click(); 
        });
    });


	// ------------------------------------------------------------------
	    // --- 2. 駐車場利用状況 (content1) の処理 ---
	    // ------------------------------------------------------------------
	    const parkingStatusCells = document.querySelectorAll('#content1 .js-parking-status');
	    
	    parkingStatusCells.forEach((cell, index) => {
	        // HTML側で `<span class="view-mode-text">` と `<div class="edit-mode-select">` が既にある前提
	        const textSpan = cell.querySelector('.view-mode-text');
	        const editWrapper = cell.querySelector('.edit-mode-select');
	        const selectElement = cell.querySelector('.situation-select'); 
	        const updateButton = cell.querySelector('.js-update-button');
	        const cancelButton = cell.querySelector('.js-cancel-button');
	        
            // ✅ 追加：絶対配置の基準を設定 (HTML側にもCSS定義が必要だが、JS側でも保険として追加)
            cell.style.position = 'relative';

	        // 必須要素がない場合はエラーを出して終了 
	        if (!textSpan || !editWrapper || !selectElement || !updateButton || !cancelButton) {
	            console.error("駐車場利用状況の更新に必要なHTML要素が見つかりません。", cell);
	            return; 
	        }
            
            // ✅ 追加：編集モードのオーバーレイ位置を修正 (HTML側で style="display: none;" のみのため、JSで追加設定)
            editWrapper.style.position = 'absolute';
            editWrapper.style.top = '100%';
            editWrapper.style.left = '0';
            editWrapper.style.zIndex = '10';
            editWrapper.style.background = '#f8f9fa'; 
            editWrapper.style.border = '1px solid #ccc';
            editWrapper.style.padding = '5px';
            editWrapper.style.whiteSpace = 'nowrap'; 

	        // ==========================================================
	        // 3. イベントリスナー（クリックと更新処理）
	        // ==========================================================
	        
	        // <td>クリック (編集モードへ切り替え)
	        cell.addEventListener('click', function(e) {
	            e.stopPropagation(); 
	            
	            // 既に編集モードが表示されている、または編集モードの要素をクリックした場合は処理しない
	            if (editWrapper.style.display === 'inline-flex' || editWrapper.contains(e.target)) {
	                return;
	            }

	            // select要素の値を現在の表示値 (data-status-id に格納された ID) にセット
	            const currentStatusId = cell.getAttribute('data-status-id'); 
	            selectElement.value = currentStatusId;
	        
				// 表示モードを非表示
				textSpan.style.display = 'none';

				// 編集モードを表示
				editWrapper.style.display = 'inline-flex'; 

				selectElement.focus(); 
	        });

			// 更新ボタンが押されたとき (編集 -> 表示 & AJAX POST処理)
			updateButton.addEventListener('click', function(e) {
			    e.stopPropagation(); 
			        
			    // 1. 選択された新しい値 (ID) と表示テキストを取得
			    const newValueId = selectElement.value; 
			    const newTextName = selectElement.options[selectElement.selectedIndex].textContent; 
			            
			    // 2. 変更対象のレコードIDと更新するカラム名を取得
			    const parkingId = cell.closest('tr').getAttribute('data-parking-id'); 
			    const fieldName = updateButton.getAttribute('data-field-name'); 

			    // 3. サーバー送信処理を実行
			    sendUpdateToServer(parkingId, fieldName, newValueId)
			          .then(() => {
			          // 成功した場合のみDOMを更新
			          textSpan.textContent = newTextName;
			          cell.setAttribute('data-status-id', newValueId); 
	                  textSpan.style.display = 'inline-block'; 
			                
			          // 編集モードを非表示
			          editWrapper.style.display = 'none';
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
	             textSpan.style.display = 'inline-block';
                 // 編集前の値に戻す
                 const originalStatusId = cell.getAttribute('data-status-id'); 
                 selectElement.value = originalStatusId;
	        });
	        
	    });

    // ------------------------------------------------------------------
    // --- 3. 来館状況 (content2) の処理 ---
    // ------------------------------------------------------------------
    const situationCells = document.querySelectorAll('#content2 .js-visit-situation');

    // 来館状況の選択肢リスト
    const situations = [
        '来館前',
        '案内済',
        '退館済',
        'キャンセル'
    ];

    situationCells.forEach((cell, index) => {
        // 既に処理済みならスキップ
        if (cell.querySelector('.situation-text')) { return; }
        
        // 元の値を取得
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; // セルの中身をクリア
        cell.style.position = 'relative'; // ✅ 追加：絶対配置の基準を設定

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue;
        textSpan.className = 'situation-text';
        textSpan.style.display = 'inline-block'; // 初期表示
        
        // セルに直接テキスト表示要素を追加
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode'; // 編集モード用コンテナ
        editWrapper.style.display = 'none'; // 初期状態は非表示
        editWrapper.setAttribute('data-original-value', originalValue); // 元の値を保存
        
        // ✅ 修正/追加：ボタンをデータの下に移動させるスタイル
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa';
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.display = 'inline-flex'; // 編集モードの表示を flex に変更

        // 2-1. select要素（プルダウン）の作成
        const selectElement = document.createElement('select');
        selectElement.name = `visit_situation_${index + 1}`; 
        selectElement.className = 'situation-select'; 

        // オプションの作成
        situations.forEach(situation => {
            const option = document.createElement('option');
            option.value = situation;
            option.textContent = situation;
            selectElement.appendChild(option);
        });
        editWrapper.appendChild(selectElement);

        // 2-2. 更新ボタン
        const updateButton = document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.className = 'update-button'; // クラス追加
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);
        
        // ✅ 2-3. 取消ボタン (追加)
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
        // 3. イベントリスナー（左クリックと更新処理）
        // ==========================================================
        
        // 左クリック (click) イベントのリスナー
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            // 既に編集モードが表示されている場合は何もしない
            if (editWrapper.style.display === 'inline-flex' || editWrapper.contains(e.target)) {
                return;
            }

            // 編集モードを表示する前に、select要素の値を現在の表示値にセットする
            const currentValue = textSpan.textContent;
            selectElement.value = currentValue;
            
            // 表示モードを非表示
            textSpan.style.display = 'none';

            // 編集モードを表示
            editWrapper.style.display = 'inline-flex';
            selectElement.focus();
        });

        // 更新ボタンが押されたとき (編集 -> 表示)
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            // 1. 選択された新しい値を取得
            const newValue = selectElement.value;
            
            // 2. 表示モードのテキストを更新
            textSpan.textContent = newValue;
            cell.setAttribute('data-value', newValue);
            
            // 3. 編集モードを非表示
            editWrapper.style.display = 'none';
            textSpan.style.display = 'inline-block';
            
            // 🚨 ここでサーバーへのデータ送信処理を実装
            alert(`来館状況を ${newValue} に更新しました (ダミー処理)`);
        });
        
        // ✅ 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
             e.stopPropagation(); 
             editWrapper.style.display = 'none';
             textSpan.style.display = 'inline-block';
             // 編集前の値に戻す
             selectElement.value = textSpan.textContent; 
        });
    });

    // ------------------------------------------------------------------
    // --- 4. 送迎バス入出庫状況 (content3) の処理 ---
    // ------------------------------------------------------------------
    const busStatusCells = document.querySelectorAll('#content3 .js-bus-status');

    // 入出庫状況の選択肢リスト
    const busStatuses = [
        '到着前',
        '到着済',
        '下車出発済',
        '乗車出発済',
        'キャンセル'
    ];

    busStatusCells.forEach((cell, index) => {
        // 既に処理済みならスキップ
        if (cell.querySelector('.situation-text')) { return; }
        
        // 元の値を取得
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; // セルの中身をクリア
        cell.style.position = 'relative'; // ✅ 追加：絶対配置の基準を設定

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue;
        textSpan.className = 'situation-text';
        textSpan.style.display = 'inline-block'; // 初期表示
        
        // セルに直接テキスト表示要素を追加
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode'; // 編集モード用コンテナ
        editWrapper.style.display = 'none'; // 初期状態は非表示
        editWrapper.setAttribute('data-original-value', originalValue); // 元の値を保存
        
        // ✅ 修正/追加：ボタンをデータの下に移動させるスタイル
        editWrapper.style.position = 'absolute';
        editWrapper.style.top = '100%';
        editWrapper.style.left = '0';
        editWrapper.style.zIndex = '10';
        editWrapper.style.background = '#f8f9fa';
        editWrapper.style.border = '1px solid #ccc';
        editWrapper.style.padding = '5px';
        editWrapper.style.display = 'inline-flex'; // 編集モードの表示を flex に変更

        // 2-1. select要素（プルダウン）の作成
        const selectElement = document.createElement('select');
        selectElement.name = `bus_status_${index + 1}`; 
        selectElement.className = 'bus-status-select'; 

        // オプションの作成
        busStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            selectElement.appendChild(option);
        });
        editWrapper.appendChild(selectElement);

        // 2-2. 更新ボタン
        const updateButton = document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.className = 'update-button'; // クラス追加
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);
        
        // ✅ 2-3. 取消ボタン (追加)
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
        // 3. イベントリスナー（左クリックと更新処理）
        // ==========================================================
        
        // 左クリック (click) イベントのリスナー
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            // 既に編集モードが表示されている場合は何もしない
            if (editWrapper.style.display === 'inline-flex' || editWrapper.contains(e.target)) {
                return;
            }

            // 編集モードを表示する前に、select要素の値を現在の表示値にセットする
            const currentValue = textSpan.textContent;
            selectElement.value = currentValue;
            
            // 表示モードを非表示
            textSpan.style.display = 'none';

            // 編集モードを表示
            editWrapper.style.display = 'inline-flex';
            selectElement.focus();
        });

        // 更新ボタンが押されたとき (編集 -> 表示)
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            // 1. 選択された新しい値を取得
            const newValue = selectElement.value;
            
            // 2. 表示モードのテキストを更新
            textSpan.textContent = newValue;
            cell.setAttribute('data-value', newValue);
            
            // 3. 編集モードを非表示
            editWrapper.style.display = 'none';
            textSpan.style.display = 'inline-block';
            
            // 🚨 ここでサーバーへのデータ送信処理を実装
            alert(`送迎バス入出庫状況を ${newValue} に更新しました (ダミー処理)`);
        });
        
        // ✅ 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
             e.stopPropagation(); 
             editWrapper.style.display = 'none';
             textSpan.style.display = 'inline-block';
             // 編集前の値に戻す
             selectElement.value = textSpan.textContent;
        });
    });

    // ------------------------------------------------------------------
    // --- 5. 車両ナンバー (content1) の処理 ---
    // ------------------------------------------------------------------
    const vehicleCells = document.querySelectorAll('#content1 .js-vehicle-number-field');

    vehicleCells.forEach(cell => {
        const textSpan = cell.querySelector('.vehicle-number-text');
        const form = cell.querySelector('.vehicle-number-form');
        const input = cell.querySelector('.vehicle-number-input');
        const updateButton = cell.querySelector('.update-vehicle-button');
        
        // ✅ [追加] 取消ボタンをDOMに追加
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'cancel-button update-vehicle-button';
        cancelButton.style.marginLeft = '5px';
        form.appendChild(cancelButton);

        // ✅ 追加：絶対配置の基準を設定
        cell.style.position = 'relative';

        if (!textSpan || !form || !input || !updateButton) {
            console.error("車両ナンバー欄の必須HTML要素が見つかりませんでした。", cell);
            return; 
        }
        
        // ✅ 追加：編集モードのオーバーレイ位置を修正 (formに適用)
        form.style.position = 'absolute';
        form.style.top = '100%';
        form.style.left = '0';
        form.style.zIndex = '10';
        form.style.background = '#f8f9fa'; 
        form.style.border = '1px solid #ccc';
        form.style.padding = '5px';
        form.style.whiteSpace = 'nowrap';
        
        let originalValue = input.value; 
        
        function switchToDisplayMode() {
            textSpan.textContent = input.value; 
            
            form.style.display = 'none';
            textSpan.style.display = 'inline';
        }
        
        function switchToEditMode() {
             originalValue = input.value; 
            
             textSpan.style.display = 'none';
             form.style.display = 'flex'; // CSSに合わせてflex
             input.focus(); 
        }

        // ==========================================================
        // 1. セルクリックイベント (編集モードへの切り替え)
        // ==========================================================
        cell.addEventListener('click', function(e) {
            e.stopPropagation(); // グローバルクリックでの即時終了を防ぐ

            if (form.contains(e.target)) {
                return;
            }
            switchToEditMode();
        });

        // ==========================================================
        // 2. inputのフォーカスアウト (blur) イベントのロジックを変更
        // ==========================================================
        input.addEventListener('blur', function() {
            // ✅ [修正] blurでは元の値に戻さず、編集モードも終了しない（更新/取消/グローバルクリックで制御）
            // if (input.value !== originalValue) {
            //     input.value = originalValue; 
            //     console.log("更新せずに離脱しました。元の値に戻しました:", originalValue);
            // }
            // switchToDisplayMode(); 
        });

        // ==========================================================
        // 3. フォーム送信 (更新ボタンクリック) イベントを捕捉
        // ==========================================================
        form.addEventListener('submit', function(e) {
            e.preventDefault(); 
            // サーバー送信ロジック（ダミー）
            console.log("更新ボタンが押されました。車両ナンバー:", input.value, "をサーバーに送信します。");
            originalValue = input.value; // 新しい値をオリジナルとして保存
            switchToDisplayMode();
            alert(`車両ナンバーを ${originalValue} に更新しました (ダミー処理)`);
        });

        // Enterキーが押されたときも submit を発生
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                updateButton.click(); // 更新ボタンをクリック
            }
        });
        
        // ✅ [追加] 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
            e.stopPropagation();
            input.value = originalValue; // 元の値に戻す
            switchToDisplayMode();
        });

        switchToDisplayMode(); 
    });

    // ------------------------------------------------------------------
    // --- 6. 備考欄 (js-remarks-field) の処理 --- (旧 No.7)
    // ------------------------------------------------------------------
    const remarksCellsNew = document.querySelectorAll('.js-remarks-field'); 

    remarksCellsNew.forEach(cell => {
        // 必須要素の取得
        const textSpan = cell.querySelector('.remarks-text');
        const editForm = cell.querySelector('.remarks-edit-form');
        const textarea = cell.querySelector('.remarks-textarea');
        const updateButton = cell.querySelector('.update-remarks-button');
        
        // ✅ [追加] 取消ボタンをDOMに追加
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'cancel-remarks-button update-remarks-button'; // スタイル共有のためクラス追加
        editForm.appendChild(cancelButton);

        // ✅ 追加：絶対配置の基準を設定
        cell.style.position = 'relative';

        if (!textSpan || !editForm || !textarea || !updateButton) {
            return; 
        }
        
        // ✅ 追加：編集モードのオーバーレイ位置を修正 (formに適用)
        editForm.style.position = 'absolute';
        editForm.style.top = '100%';
        editForm.style.left = '0';
        editForm.style.zIndex = '10';
        editForm.style.background = '#f8f9fa'; 
        editForm.style.border = '1px solid #ccc';
        editForm.style.padding = '5px';
        editForm.style.width = '250px'; // 適当な幅を設定
        editForm.style.flexDirection = 'column'; // テキストエリアとボタンを縦に並べる

        let originalValue = textarea.value; 

        function switchToDisplayMode() {
            textSpan.textContent = textarea.value; 
            
            editForm.style.display = 'none';
            textSpan.style.display = 'block'; 
        }
        
        function switchToEditMode() {
             originalValue = textarea.value; 
            
             textSpan.style.display = 'none';
             editForm.style.display = 'flex'; 
             textarea.focus(); 
        }

        // ==========================================================
        // 1. セル/テキストクリックイベント (編集モードへの切り替え)
        // ==========================================================
        cell.addEventListener('click', function(e) {
            e.stopPropagation();

            if (editForm.contains(e.target)) {
                return;
            }
            switchToEditMode();
        });

        // ==========================================================
        // 2. textareaのフォーカスアウト (blur) イベントのロジックを変更
        // ==========================================================
        textarea.addEventListener('blur', function() {
            // ✅ [修正] blurでは元の値に戻さず、編集モードも終了しない（更新/取消/グローバルクリックで制御）
            // if (document.activeElement === updateButton) {
            //     return; 
            // }

            // if (textarea.value !== originalValue) {
            //     textarea.value = originalValue; 
            //     console.log("備考欄を更新せずに離脱。元の値に戻しました:", originalValue);
            // }
            // switchToDisplayMode(); 
        });

        // ==========================================================
        // 3. 更新ボタンクリックで値を確定し、サーバーに送信
        // ==========================================================
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            originalValue = textarea.value; 
            
            switchToDisplayMode();
            
            console.log("備考欄の更新ボタンが押されました。備考:", textarea.value, "をサーバーに送信します。");
            alert(`備考欄を更新しました (ダミー処理)`);
        });
        
        // ✅ [追加] 取消ボタンのイベントリスナー
        cancelButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
            textarea.value = originalValue; // 元の値に戻す
            switchToDisplayMode();
        });
        
        switchToDisplayMode(); 
    });

    // ------------------------------------------------------------------
    // --- 7. データが空の場合のレイアウト崩れ対策 --- (旧 No.8)
    // ------------------------------------------------------------------
    const allTables = document.querySelectorAll('.excel-table');
    const isMobileView = window.innerWidth <= 768; 

    allTables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const dataRows = Array.from(tbody.children).filter(tr => 
            !tr.classList.contains('no-data-row') && !tr.classList.contains('no-data-row-mobile')
        );
        
        const noDataRowPC = tbody.querySelector('.no-data-row');
        const noDataRowMobile = tbody.querySelector('.no-data-row-mobile');

        if (dataRows.length === 0) {
            if (noDataRowPC) noDataRowPC.style.display = isMobileView ? 'none' : 'table-row';
            if (noDataRowMobile) noDataRowMobile.style.display = isMobileView ? 'table-row' : 'none';
        } else {
            if (noDataRowPC) noDataRowPC.style.display = 'none';
            if (noDataRowMobile) noDataRowMobile.style.display = 'none';
        }
    });
    
    // ------------------------------------------------------------------
    // --- 8. グローバルな編集モード終了処理 (全てのセクションから移動/統合) ---
    // ------------------------------------------------------------------
    document.addEventListener('click', function(e) {
        
        // 現在表示されている編集モードの要素を取得
        const activeEditModes = document.querySelectorAll(
            '.edit-mode[style*="inline-flex"], .edit-mode-select[style*="inline-flex"], .remarks-edit-form[style*="flex"], .vehicle-number-form[style*="flex"]'
        );

        activeEditModes.forEach(editWrapper => {
            // クリックした要素が、編集モードのコンテナ内ではないことを確認
            if (!editWrapper.contains(e.target)) {
                
                // 編集モードを非表示
                editWrapper.style.display = 'none';
                
                const cell = editWrapper.closest('td');
                if (cell) {
                    
                    const viewText = cell.querySelector('.permit-number-text, .view-mode-text, .situation-text, .remarks-text, .vehicle-number-text'); 
                    
                    if (viewText) {
                        // 備考欄は block、その他は inline-block
                        viewText.style.display = (viewText.classList.contains('remarks-text') || viewText.classList.contains('vehicle-number-text')) ? 'block' : 'inline-block';
                        
                        // 編集前の値に戻す処理 (プルダウン/テキスト系)
                        const select = editWrapper.querySelector('select');
                        const input = editWrapper.querySelector('input');
                        const textarea = editWrapper.querySelector('textarea');
                        
                        if (select) {
                            // プルダウン：表示中のテキスト値に戻す
                            const originalText = viewText.textContent;
                            select.value = originalText; 
                        } else if (input || textarea) {
                            // 車両ナンバー/備考欄：元の値に戻す
                            const originalValue = cell.querySelector('input, textarea').value;
                            if (cell.querySelector('input')) cell.querySelector('input').value = originalValue;
                            if (cell.querySelector('textarea')) cell.querySelector('textarea').value = originalValue;
                            viewText.textContent = originalValue;
                        }
                    }
                }
            }
        });
    });


}); // DOMContentLoaded 終了