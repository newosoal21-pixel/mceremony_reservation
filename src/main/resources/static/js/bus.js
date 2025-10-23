/**
 * bus.js
 * * 送迎バス運行リスト (#content3) の機能とロジック
 * * 依存: common.js (sendUpdateToServer, formatDate)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: bus.js の実行が開始されました。"); 
    
    const busContent = document.getElementById('content3');
    if (!busContent) return; // タブ3がない場合は終了

    // 💡 修正: これらの変数は common.js の sendUpdateToServer 内で取得されるため、ここでは不要、または冗長
    // const csrfToken = document.querySelector('meta[name="_csrf"]').content;
    // const csrfHeader = document.querySelector('meta[name="_csrf_header"]').content;

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
	        // 💡 修正: 以前のコードのコメントと整合性を保つため、プロパティ名を 'statusName' に変更 (元のコードは 'name' でしたが、一般的なDTOの命名規則に基づき修正)
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
        
        // 1. 入出庫状況 (クリック)
	    busTableBody.addEventListener('click', (e) => {
	        const cell = e.target.closest('.js-bus-status');
            // 乗車数欄をクリックした場合は入出庫状況の処理をしない
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
        
        // 2. 乗車数 (シングルクリック)
        busTableBody.addEventListener('click', (e) => {
            const cell = e.target.closest('.js-passengers-field');

            // 乗車数セル以外、またはボタンクリックの場合は無視
            if (!cell || e.target.closest('button')) return; 
            // 既に編集モードの場合は無視
            if (cell.classList.contains('is-editing')) return;
            // 他のセルが編集中であれば無視
            if (busContent.querySelector('.js-passengers-field.is-editing, .js-bus-status.is-editing')) return;
            
            // 編集モード要素の取得
            const passengersText = cell.querySelector('.passengers-text');
            const editForm = cell.querySelector('.passengers-edit-form');
            const input = cell.querySelector('.passengers-input');

            if (!passengersText || !editForm || !input) {
                 console.error("DEBUG ERROR: 乗車数の必須要素が見つかりません。HTMLのクラス名を確認してください。");
                 return; 
            }
            
            // 現在の表示値から「名」を除去し、inputに設定する
            let currentValue = passengersText.textContent.replace('名', '').trim();
            
            if (currentValue === '') {
                currentValue = passengersText.dataset.originalValue || '';
            }
            input.value = currentValue;

            // 🚀 スタイルの調整: inputの幅を100%にし、枠内に収める
            input.style.width = '100%'; 
            input.style.MozAppearance = 'textfield';        // Firefox
            input.style.WebkitAppearance = 'none';          // Chrome, Safari
            input.style.margin = '0';                       // マージンをリセット

            // is-editing クラスを付与
            cell.classList.add('is-editing');
            
            // インラインスタイルで表示/非表示を切り替える
            passengersText.style.display = 'none';
            editForm.style.display = 'block'; // Flexboxに上書きされるが、一時的に
            editForm.style.visibility = 'visible'; 
            
            // 🚀 スタイルの調整: Flexbox設定と最大幅の制限 (フォーム全体をセルに合わせる)
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
                editForm.style.maxWidth = ''; // リセット
                editForm.style.boxSizing = ''; // リセット
                
                input.style.width = ''; 
                input.style.MozAppearance = ''; 
                input.style.WebkitAppearance = ''; 
                input.style.margin = ''; 
            }
        });


	    // ==========================================================
        // C. 「更新」ボタンクリック処理 (API連携) (イベント委譲)
        // ==========================================================

		// 1. 入出庫状況の更新 (アラートなし)
        busTableBody.addEventListener('click', async (e) => {
            const updateButton = e.target.closest('.js-update-button-bus');
            if (!updateButton) return;

            const cell = updateButton.closest('.js-bus-status');
            const row = updateButton.closest('tr');
            
            const recordId = cell.getAttribute('data-record-id'); 
            const selectElement = cell.querySelector('.js-bus-situation-select');
            
            const fieldName = updateButton.dataset.fieldName; 
            const newValueId = selectElement.value; 

            if (!newValueId || newValueId.trim() === '') {
                 alert('入出庫状況を選択してください。');
                 return;
            }
            
            // 🚀 [修正1] 時刻フォーマットを 'YYYY/MM/DD HH:MM' に変更
            // common.jsのformatDate(new Date())を使用
            if (typeof formatDate === 'undefined') {
                console.error("ERROR: formatDate関数がcommon.jsで見つかりません。");
                alert("時刻フォーマット関数が未定義です。common.jsを確認してください。");
                return;
            }
            const currentTime = formatDate(new Date());

            let extraField = null;
            let extraValue = '';
            // 選択されたオプションの表示名を取得
            const newStatusName = selectElement.options[selectElement.selectedIndex].textContent.trim();
            
            if (fieldName === 'busSituation') {
                
                // 🚀 [修正2] 下車出発済の場合、emptybusDepTimeを格納
                if (newStatusName === '下車出発済') {
                    extraField = 'emptybusDepTime';
                    extraValue = currentTime;
                } 
                // 🚀 [修正3] 乗車出発済の場合、departureTimeを格納
                else if (newStatusName === '乗車出発済') {
                    extraField = 'departureTime';
                    extraValue = currentTime;
                }
            }
            
            try {
                // ✅ API呼び出し: extraFieldとextraValueを含めてsendUpdateToServerを呼び出し
                const result = await sendUpdateToServer(
                    '/api/bus/update', 
                    recordId, 
                    fieldName, 
                    newValueId, 
                    extraField, 
                    extraValue
                );
                
                // --- 成功時の画面表示更新ロジック ---
                const viewMode = cell.querySelector('.view-mode-text');
                const editMode = cell.querySelector('.edit-mode-select');
                
                viewMode.textContent = newStatusName;
                cell.setAttribute('data-status-id', newValueId); 
                
                // 最終更新日時 (12列目) を更新
                const updateTimeCell = row.querySelector('td:nth-child(12)'); 
                
                if (updateTimeCell) {
                     // サーバーから返された時刻があればそれを使う。なければローカルの時刻 (currentTime) を使う。
                     updateTimeCell.textContent = result.updateTime || currentTime; 
                }
                
                // 🚀 [修正4] 出庫時刻欄 (5列目/7列目) を更新
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
                
                cell.classList.remove('is-editing');
                viewMode.style.display = 'inline'; 
                editMode.style.display = 'none'; 
                
                console.log('入出庫状況の更新と時刻記録に成功しました。');


            } catch (error) {
                // --- 失敗時のロジック ---
                console.error('API呼び出しエラー:', error);
                
                alert('更新に失敗しました。詳細: ' + error.message);
                
                cell.querySelector('.js-cancel-button-bus').click(); 
            }
        });
        
        // 2. 乗車数の更新 (アラートあり)
        busTableBody.addEventListener('click', (e) => {
            const updateButton = e.target.closest('.js-update-passengers-button');
            if (!updateButton) return;

            const cell = updateButton.closest('.js-passengers-field');
            const recordId = cell.dataset.recordId;
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
                alert('乗車数には数値を入力してください。');
                return;
            }
            if (parsedValue < 0) {
                 alert('乗車数は0以上の値を入力することはできません。');
                 return;
            }
            
            // 💡 修正: 乗車数の更新は時刻のみの getFormattedCurrentTime() を使用 (このフィールドの更新は日付を必要としないため)
            const currentTime = getFormattedCurrentTime();

            // ✅ API呼び出し: common.jsの5引数形式 (extraField, extraValue は null)
            sendUpdateToServer(
                '/api/bus/update', 
                recordId, 
                'passengers', 
                newValue, 
                null, 
                null
            )
                .then(response => {
                    if (response.status === 'success') {
                        // 成功した場合、表示値を更新し、編集モードを終了
                        const updateTimeCell = cell.closest('tr').querySelector('.js-update-time-field');
                        
                        passengersText.textContent = parsedValue + '名';
                        passengersText.dataset.originalValue = parsedValue; 
                        
                        if (updateTimeCell) {
                            updateTimeCell.textContent = response.updateTime || currentTime;
                        }
                        
                        // 💡 確認メッセージ (アラート)
                        alert('乗車人数の更新に成功しました！');

                        // 表示モードに戻す
                        cell.classList.remove('is-editing');
                        passengersText.style.display = 'inline';
                        editForm.style.display = 'none';
                        editForm.style.visibility = 'hidden'; 
                        
                        // 💡 スタイルをリセット
                        editForm.style.flexDirection = '';
                        editForm.style.alignItems = '';
                        editForm.style.gap = '';
                        editForm.style.maxWidth = ''; // リセット
                        editForm.style.boxSizing = ''; // リセット

                        input.style.width = ''; 
                        input.style.MozAppearance = ''; 
                        input.style.WebkitAppearance = ''; 
                        input.style.margin = ''; 
                        
                    } else {
                        // サーバー側でエラーが発生した場合
                        alert('乗車人数の更新に失敗しました: ' + (response.message || '不明なエラー'));
                        cell.querySelector('.js-cancel-passengers-button').click();
                    }
                })
                .catch(error => {
                    // 通信エラーなどの場合
                    alert('サーバーへの接続中にエラーが発生しました。');
                    console.error('Update error:', error);
                    cell.querySelector('.js-cancel-passengers-button').click();
                });
        });


	} // busTableBody の if の閉じ

}); // DOMContentLoaded の閉じ