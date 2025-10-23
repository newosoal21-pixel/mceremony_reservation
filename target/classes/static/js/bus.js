/**
 * bus.js
 * * 送迎バス運行リスト (#content3) の機能とロジック
 * * 依存: common.js (sendUpdateToServer, getFormattedCurrentTime)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: bus.js の実行が開始されました。"); 
    
	// ==========================================================
	// 1. データストア: 取得した状況データを保持する変数
	// ==========================================================
	let busSituationsData = []; 

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
	        alert("入出庫状況の選択肢データをロードできませんでした。");
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
	        option.value = situation.id;      // IDを値として使用
	        option.textContent = situation.name; // Nameを表示名として使用
	        selectElement.appendChild(option);
	    });
	}
    
    
	// ------------------------------------------------------------------
	// --- 5. 送迎バス運行リスト (content3) の処理 ---
	// ------------------------------------------------------------------
	const busTableBody = document.querySelector('#content3 .excel-table tbody');

	if (busTableBody) {
	    
	    // 1. 編集モードに切り替えるイベント委譲
	    busTableBody.addEventListener('click', (e) => {
	        const cell = e.target.closest('.js-bus-status');
	        
	        // 既に編集モード内の要素、またはボタンがクリックされた場合は処理を中断
	        if (!cell || e.target.closest('button')) return;
	        
	        // 既に編集モードが表示されているセルを再クリックした場合も中断 (クラスで判断)
	        if (cell.classList.contains('is-editing')) return;
	        
	        // 編集モード要素を取得
	        const editMode = cell.querySelector('.edit-mode-select');
	        if (!editMode) return;
	        
	        // 💡 選択肢データをセレクタに挿入
	        const selectElement = cell.querySelector('.js-bus-situation-select');
	        if (selectElement) {
	            // 💡 関数を呼び出してオプションを動的に生成
	            populateBusStatusSelect(selectElement); 

	            // data-status-idを取得し、セレクタの初期値として設定
	            const originalStatusId = cell.getAttribute('data-status-id');
	            if (originalStatusId) {
	                 selectElement.value = originalStatusId;
	            }
	        }

	        // 💡 修正点 2: is-editing クラスを付与
	        cell.classList.add('is-editing');

	        // 以前のインラインスタイルによる表示をリセット（念のため）
	        const viewMode = cell.querySelector('.view-mode-text');
	        if(viewMode) viewMode.style.display = ''; 
	        if(editMode) editMode.style.display = '';

	        if(selectElement) selectElement.focus();
	    });

	    // 2. 「取消」ボタンクリック処理 (イベント委譲)
	    busTableBody.addEventListener('click', (e) => {
	        const cancelButton = e.target.closest('.js-cancel-button-bus');
	        if (!cancelButton) return;

	        const cell = cancelButton.closest('.js-bus-status');
	        
	        const viewMode = cell.querySelector('.view-mode-text');
	        const editMode = cell.querySelector('.edit-mode-select');
	        
	        if (viewMode && editMode) {
	            // 💡 修正点 3: is-editing クラスを除去
	            cell.classList.remove('is-editing');
	            
	            // インラインスタイルをリセット（CSS制御に戻す）
	            viewMode.style.display = '';
	            editMode.style.display = '';
	            
	            // セレクトボックスの選択を元の値に戻す (data-status-id属性を参照)
	            const originalStatusId = cell.getAttribute('data-status-id');
	            const selectElement = cell.querySelector('.js-bus-situation-select');
	            if (selectElement && originalStatusId) {
	                selectElement.value = originalStatusId;
	            }
	        }
	    });

		// 3. 「更新」ボタンクリック処理 (API連携) (イベント委譲)
        busTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-button-bus');
            if (!updateButton) return;

            const cell = updateButton.closest('.js-bus-status');
            const row = updateButton.closest('tr');
            
            const recordId = cell.getAttribute('data-record-id'); 
            const selectElement = cell.querySelector('.js-bus-situation-select');
            
            const fieldName = updateButton.dataset.fieldName; 
            const newValueId = selectElement.value; 

            // 💡 必須チェックを追加
            if (!newValueId || newValueId.trim() === '') {
                 alert('入出庫状況を選択してください。');
                 return;
            }
            
            // 💡 現在時刻を先に取得
            const currentTime = getFormattedCurrentTime();

            // --- DB送信用の時刻記録ロジック (API呼び出し前) ---
            let extraField = null;
            let extraValue = '';
            const newStatusName = selectElement.options[selectElement.selectedIndex].textContent.trim();
            
            // 💡 バス状況フィールドの処理
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
            // 💡 他のフィールド（例：入庫/出庫時刻）の処理
            else if (fieldName === 'otherField') { // 実際のfieldNameに合わせて変更してください
                if (newStatusName === '出庫') {
                    extraField = 'departure_time'; 
                    extraValue = currentTime;
                } else if (newStatusName === '入庫') {
                    extraField = 'arrival_time'; 
                    extraValue = currentTime;
                }
            }


            try {
                // ✅ API呼び出し (sendUpdateToServerが成功すると、結果が result に入る)
                // sendUpdateToServerはcommon.jsからグローバルにアクセス可能
                const result = await sendUpdateToServer('/api/bus/update', recordId, fieldName, newValueId, extraField, extraValue);
                
                
                // --- 💡 成功時の画面表示更新ロジック (tryブロック内) ---

                const viewMode = cell.querySelector('.view-mode-text');
                const editMode = cell.querySelector('.edit-mode-select');
                
                viewMode.textContent = newStatusName;
                cell.setAttribute('data-status-id', newValueId); 
                
                // 💡 更新日時フィールドを検索 (td:nth-child(12))
                const updateTimeCell = row.querySelector('td:nth-child(12)'); 
                
                // 💡 タイムスタンプ表示
                if (updateTimeCell) {
                     // サーバーから時刻が返された場合はそれを使用。ない場合は現在時刻。
                     updateTimeCell.textContent = result.updateTime || formatDate(new Date()); 
                }
                
                // 💡 出庫時刻などのセルへの表示更新
                if (fieldName === 'busSituation') {
                    if (newStatusName === '下車出発済') {
                        const emptyBusDepTimeCell = row.querySelector('td:nth-child(5)'); 
                        if (emptyBusDepTimeCell) emptyBusDepTimeCell.textContent = currentTime;
                    } 
                    else if (newStatusName === '乗車出発済') {
                        const depTimeCell = row.querySelector('td:nth-child(7)'); 
                        if (depTimeCell) depTimeCell.textContent = currentTime;
                    }
                }
                
                // 💡 モードを切り替え（クラスを除去）
                cell.classList.remove('is-editing');
                
                // インラインスタイルをリセット（CSS制御に戻す）
                viewMode.style.display = ''; 
                editMode.style.display = ''; 
                
                // 成功アラート
                alert('更新に成功しました！');


            } catch (error) {
                // --- 💡 失敗時のロジック (catchブロック内) ---
                console.error('API呼び出しエラー:', error);
                
                // 失敗アラート
                alert('更新に失敗しました。詳細: ' + error.message);
                
                // 編集モードをキャンセル（表示モードに戻す）
                cell.querySelector('.js-cancel-button-bus').click(); 
            }
        });
	}

}); // DOMContentLoaded の閉じ