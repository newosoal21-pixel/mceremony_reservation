document.addEventListener('DOMContentLoaded', () => {
    // 駐車証No.と駐車位置の両方に適用
    const permitCells = document.querySelectorAll('#content1 .js-permit-number, #content1 .js-permit-location');

    // 駐車証No.の選択肢リスト
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

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue || '-'; 
        textSpan.className = 'permit-number-text'; 
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode';
        editWrapper.style.display = 'none'; 
        editWrapper.style.whiteSpace = 'nowrap'; 

        // 2-1. select要素（プルダウン）の作成
        const selectElement = document.createElement('select');
        selectElement.name = `parking_permit_or_location_${index + 1}`; 
        selectElement.className = 'permit-select'; 
        
        // オプションの作成
        for (let i = 1; i <= 24; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            // ... 選択状態の設定 ...
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

        cell.appendChild(editWrapper);

        // ==========================================================
        // 3. イベントリスナー（クリックと更新処理）
        // ==========================================================
        
        // <td>クリック (編集モードへ切り替え)
        cell.addEventListener('click', function(e) {
            e.stopPropagation(); 
            
            if (editWrapper.style.display === 'block' || e.target.tagName === 'SELECT' || e.target === updateButton) {
                return;
            }

            // select要素の値を現在の表示値にセット
            const currentValue = textSpan.textContent === '-' ? '' : textSpan.textContent;
            selectElement.value = currentValue;
        
            // 表示モードを非表示
            textSpan.style.display = 'none';
            
            // 編集モードを表示
            editWrapper.style.display = 'block';
            selectElement.focus(); 
        });

        // 更新ボタンが押されたとき (編集 -> 表示 & ダミーPOST処理)
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
        
            // 1. 選択された新しい値を取得
            const newValue = selectElement.value;
            const newText = selectElement.options[selectElement.selectedIndex].textContent;
        
            // 2. 表示モードのテキストを更新
            textSpan.textContent = newText;
            cell.setAttribute('data-value', newValue); 
            textSpan.style.display = 'inline-block'; 
        
            // 3. 編集モードを非表示
            editWrapper.style.display = 'none';
        
            // 4. 🚨 ダミーのサーバー送信処理を実行 (同期)
            // sendUpdateToServer(cell, newValue); // 外部依存関数はコメントアウト
        });
    
        // 編集モードのエリア外をクリックしたら編集モードを閉じる処理
        document.addEventListener('click', function(e) {
            if (editWrapper.style.display === 'block' && !cell.contains(e.target)) {
                editWrapper.style.display = 'none';
                textSpan.style.display = 'inline-block'; 
            }
        });

        // セレクトボックスの選択が変更されたら、更新ボタンをクリックする
        selectElement.addEventListener('change', function() {
            // updateButton.click(); // 元コードのコメントアウトを維持
        });
    });


    // ------------------------------------------------------------------
    // --- 4. 駐車場利用状況 (content1) の処理 ---
    const parkingStatusCells = document.querySelectorAll('#content1 .js-parking-status');
    // 駐車場利用状況の選択肢リスト
    const parkingStatuses = [
        '予約中',
        '入庫済',
        '出庫済',
        '宿泊',
        '一時出庫中',
        'キャンセル'
    ];

    parkingStatusCells.forEach((cell, index) => {
        // 既に処理済みならスキップ
        if (cell.querySelector('.situation-text')) { return; }
    
        // 元の値を取得
        const originalValue = cell.getAttribute('data-value') || cell.textContent.trim();
        cell.textContent = ''; // セルの中身をクリア

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue;
        textSpan.className = 'situation-text'; 
    
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode'; // 編集モード用コンテナ
        editWrapper.style.display = 'none'; // 初期状態は非表示

        // 2-1. select要素（プルダウン）の作成
        const selectElement = document.createElement('select');
        selectElement.name = `parking_status_${index + 1}`; 
        selectElement.className = 'situation-select'; 

        // オプションの作成
        parkingStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            selectElement.appendChild(option);
        });
        editWrapper.appendChild(selectElement);

        // 2-2. 更新ボタン
        const updateButton = document.createElement('button');
        updateButton.textContent = '更新';
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);

        cell.appendChild(editWrapper);

        // ==========================================================
        // 3. イベントリスナー（左クリックと更新処理）
        // ==========================================================
    
        // 左クリック (click) イベントのリスナー
        cell.addEventListener('click', function(e) {
            // 既に編集モードが表示されている、またはフォーム要素自体がクリックされた場合は何もしない
            if (editWrapper.style.display === 'block' || e.target.tagName === 'INPUT') {
                return;
            }

            if (e.target !== updateButton && e.target !== selectElement) {
            
                // 編集モードを表示する前に、select要素の値を現在の表示値にセットする
                const currentValue = textSpan.textContent;
                selectElement.value = currentValue;
            
                // 編集モードを表示
                editWrapper.style.display = 'block';
            }
        });

        // 更新ボタンが押されたとき (編集 -> 表示)
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); 
        
            // 1. 選択された新しい値を取得
            const newValue = selectElement.value;
        
            // 2. 表示モードのテキストを更新
            textSpan.textContent = newValue;
            cell.setAttribute('data-value', newValue); // data-valueも更新
        
            // 3. 編集モードを非表示
            editWrapper.style.display = 'none';
        
            // 🚨 ここでサーバーへのデータ送信処理を実装
        });
    
        // 編集モードのエリア外をクリックしたら編集モードを閉じる処理
        document.addEventListener('click', function(e) {
            // クリックされた要素が編集モードのコンテナやその子要素、またはトリガー元のセルでない場合
            if (editWrapper.style.display === 'block' && !cell.contains(e.target)) {
                editWrapper.style.display = 'none';
            }
        });
    });

    // ------------------------------------------------------------------
    // --- 2. 来館状況 (content2) の処理 ---
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

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue;
        textSpan.className = 'situation-text';
        
        // セルに直接テキスト表示要素を追加
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode'; // 編集モード用コンテナ
        editWrapper.style.display = 'none'; // 初期状態は非表示

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
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);

        cell.appendChild(editWrapper);

        // ==========================================================
        // 3. イベントリスナー（左クリックと更新処理）
        // ==========================================================
        
        // 左クリック (click) イベントのリスナー
        cell.addEventListener('click', function(e) {
            // 既に編集モードが表示されている場合は何もしない
            if (editWrapper.style.display === 'block') {
                return;
            }

            // クリックされたのが子要素（例: すでに表示されている編集モード）でないことを確認
            if (e.target !== updateButton && e.target !== selectElement) {
                
                // 編集モードを表示する前に、select要素の値を現在の表示値にセットする
                const currentValue = textSpan.textContent;
                selectElement.value = currentValue;
                
                // 編集モードを表示
                editWrapper.style.display = 'block';
            }
        });

        // 更新ボタンが押されたとき (編集 -> 表示)
        updateButton.addEventListener('click', function(e) {
            e.stopPropagation(); // ⚠️ イベントが親要素（セル）に伝播するのを防ぐ
            
            // 1. 選択された新しい値を取得
            const newValue = selectElement.value;
            
            // 2. 表示モードのテキストを更新
            textSpan.textContent = newValue;
            cell.setAttribute('data-value', newValue);
            
            // 3. 編集モードを非表示
            editWrapper.style.display = 'none';
            
            // 🚨 ここでサーバーへのデータ送信処理を実装
        });
        
        // 編集モードのエリア外をクリックしたら編集モードを閉じる処理
        document.addEventListener('click', function(e) {
            if (editWrapper.style.display === 'block' && !cell.contains(e.target)) {
                editWrapper.style.display = 'none';
            }
        });
    });

    // ------------------------------------------------------------------
    // --- 3. 送迎バス入出庫状況 (content3) の処理 ---
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

        // ==========================================================
        // 1. 表示モード (span)
        // ==========================================================
        const textSpan = document.createElement('span');
        textSpan.textContent = originalValue;
        textSpan.className = 'situation-text';
        
        // セルに直接テキスト表示要素を追加
        cell.appendChild(textSpan);

        // ==========================================================
        // 2. 編集モード (select + 更新ボタン)
        // ==========================================================
        const editWrapper = document.createElement('div');
        editWrapper.className = 'edit-mode'; // 編集モード用コンテナ
        editWrapper.style.display = 'none'; // 初期状態は非表示

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
        updateButton.style.marginLeft = '5px';
        updateButton.style.fontSize = '11px';
        updateButton.style.padding = '2px 5px';
        updateButton.style.cursor = 'pointer';
        editWrapper.appendChild(updateButton);

        cell.appendChild(editWrapper);

        // ==========================================================
        // 3. イベントリスナー（左クリックと更新処理）
        // ==========================================================
        
        // 左クリック (click) イベントのリスナー
        cell.addEventListener('click', function(e) {
            // 既に編集モードが表示されている場合は何もしない
            if (editWrapper.style.display === 'block') {
                return;
            }

            // クリックされたのが子要素（例: すでに表示されている編集モード）でないことを確認
            if (e.target !== updateButton && e.target !== selectElement) {
                
                // 編集モードを表示する前に、select要素の値を現在の表示値にセットする
                const currentValue = textSpan.textContent;
                selectElement.value = currentValue;
                
                // 編集モードを表示
                editWrapper.style.display = 'block';
            }
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
            
            // 🚨 ここでサーバーへのデータ送信処理を実装
        });
        
        // 編集モードのエリア外をクリックしたら編集モードを閉じる処理
        document.addEventListener('click', function(e) {
            if (editWrapper.style.display === 'block' && !cell.contains(e.target)) {
                editWrapper.style.display = 'none';
            }
        });
    });

    // ------------------------------------------------------------------
    // --- 5. 備考欄 (Textarea) の処理 (旧) ---
    const remarksCells = document.querySelectorAll('.js-remarks-field');

    remarksCells.forEach(cell => {
        // 既に処理済みならスキップ
        if (cell.querySelector('textarea')) { return; }
        
        // 元の値を取得 (data-original-valueから)
        const originalValue = cell.getAttribute('data-original-value') || cell.textContent.trim();
        cell.textContent = ''; // セルの中身をクリア

        const textarea = document.createElement('textarea');
        textarea.className = 'remarks-textarea';
        textarea.value = originalValue;
        
        // textareaをセルに追加
        cell.appendChild(textarea);
        
        // (オプション) テキストエリアの変更時にdata-original-valueも更新するイベントリスナー
        textarea.addEventListener('change', function() {
            cell.setAttribute('data-original-value', this.value);
            // 🚨 ここでサーバーへのデータ送信処理を実装
        });
    });


}); // DOMContentLoaded 終了 (1つ目)

document.addEventListener('DOMContentLoaded', function() {
    // --- 5. 車両ナンバー (content1) の処理 ---
    const vehicleCells = document.querySelectorAll('#content1 .js-vehicle-number-field');

    vehicleCells.forEach(cell => {
        const textSpan = cell.querySelector('.vehicle-number-text');
        const form = cell.querySelector('.vehicle-number-form');
        const input = cell.querySelector('.vehicle-number-input');

        if (!textSpan || !form || !input) {
            console.error("車両ナンバー欄の必須HTML要素が見つかりませんでした。", cell);
            return; 
        }

        // 💡 編集前の元の値を保持する変数
        let originalValue = input.value; 
        
        // 💡 編集モードから表示モードに戻す関数
        function switchToDisplayMode() {
            // 表示用<span>には、inputの現在の値（submit時）またはoriginalValue（blur時）が入る
            textSpan.textContent = input.value; 
            
            // 表示/非表示を切り替え
            form.style.display = 'none';
            textSpan.style.display = 'inline';
        }
        
        // 💡 表示モードから編集モードに切り替える関数
        function switchToEditMode() {
             // 編集モードに入る直前に、inputの現在の値を「元の値」として保存
             originalValue = input.value; 
            
             textSpan.style.display = 'none';
             form.style.display = 'flex'; // CSSに合わせてflex
             input.focus(); 
        }

        // ==========================================================
        // 1. セルクリックイベント (編集モードへの切り替え)
        // ==========================================================
        cell.addEventListener('click', function(e) {
            // フォーム内をクリックした場合は、編集モードを維持する
            if (form.contains(e.target)) {
                return;
            }
            switchToEditMode();
        });

        // ==========================================================
        // 2. inputのフォーカスアウト (blur) イベントで元の値に戻す
        // ==========================================================
        input.addEventListener('blur', function() {
            // 変更後の値が元の値と同じかチェック
            if (input.value !== originalValue) {
                // 変更されていた場合、入力フィールドの値を元の値に戻す
                input.value = originalValue; 
                console.log("更新せずに離脱しました。元の値に戻しました:", originalValue);
            }
            // 表示モードに戻す（このとき input.value は originalValue に戻っている）
            switchToDisplayMode(); 
        });

        // ==========================================================
        // 3. フォーム送信 (更新ボタンクリック) イベントを捕捉
        // ==========================================================
        form.addEventListener('submit', function(e) {
            // ページ遷移（同期送信）を行うため、このイベントでは何もしません。
            // サーバーに最新の input.value が送信され、ページがリロードされます。
            // リロード前に originalValue をリセットする必要はありません。
            console.log("更新ボタンが押されました。車両ナンバー:", input.value, "をサーバーに送信します。");
        });

        // Enterキーが押されたときも blur を発生させることで、元の値に戻す
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                input.blur(); // blurイベントを発火させて表示モードに戻す
            }
        });

        // 💡 初期状態として表示モードに設定
        switchToDisplayMode(); 
    });

    // --- 7. 備考欄 (js-remarks-field) の処理 ---
    const remarksCellsNew = document.querySelectorAll('.js-remarks-field'); // 全てのタブの備考欄に適用

    remarksCellsNew.forEach(cell => {
        // 必須要素の取得
        const textSpan = cell.querySelector('.remarks-text');
        const editForm = cell.querySelector('.remarks-edit-form');
        const textarea = cell.querySelector('.remarks-textarea');
        const updateButton = cell.querySelector('.update-remarks-button');

        if (!textSpan || !editForm || !textarea || !updateButton) {
            // HTML構造が合わないセルはスキップ
            // console.error("備考欄の必須HTML要素が見つかりませんでした。", cell); 
            return; 
        }

        // 💡 編集前の元の値を保持する変数
        let originalValue = textarea.value; 

        // 💡 編集モードから表示モードに戻す関数
        function switchToDisplayMode() {
            textSpan.textContent = textarea.value; 
            
            // 表示/非表示を切り替え
            editForm.style.display = 'none';
            textSpan.style.display = 'block'; // 備考欄のテキストはブロック表示
        }
        
        // 💡 表示モードから編集モードに切り替える関数
        function switchToEditMode() {
             // 編集モードに入る直前に、textareaの現在の値を「元の値」として保存
             originalValue = textarea.value; 
            
             textSpan.style.display = 'none';
             editForm.style.display = 'flex'; // ボタンとテキストエリアのレイアウトを考慮
             textarea.focus(); 
        }

        // ==========================================================
        // 1. セル/テキストクリックイベント (編集モードへの切り替え)
        // ==========================================================
        cell.addEventListener('click', function(e) {
            // 既に編集フォーム内であれば何もしない
            if (editForm.contains(e.target)) {
                return;
            }
            switchToEditMode();
        });

        // ==========================================================
        // 2. textareaのフォーカスアウト (blur) イベントで元の値に戻す
        // ==========================================================
        textarea.addEventListener('blur', function() {
            // 💡 blurが発生したのが更新ボタンではないことを確認
            // (ボタンにフォーカスが移るときもblurが発生するため)
            if (document.activeElement === updateButton) {
                return; 
            }

            // 変更後の値が元の値と同じかチェック
            if (textarea.value !== originalValue) {
                // 変更されていた場合、入力フィールドの値を元の値に戻す
                textarea.value = originalValue; 
                console.log("備考欄を更新せずに離脱。元の値に戻しました:", originalValue);
            }
            // 表示モードに戻す
            switchToDisplayMode(); 
        });

        // ==========================================================
        // 3. 更新ボタンクリックで値を確定し、サーバーに送信
        // ==========================================================
        updateButton.addEventListener('click', function(e) {
            // **このロジックが、新しい値を適用する唯一の瞬間です。**
            originalValue = textarea.value; // 最新の値を originalValue に設定し直す
            
            // 表示を新しい値に切り替える
            switchToDisplayMode();
            
            // 🚨 サーバーへの同期送信を行う場合は、ここで何らかの手段でフォーム送信（リロード）を発生させる処理が必要です。
            console.log("備考欄の更新ボタンが押されました。備考:", textarea.value, "をサーバーに送信します。");
            
            // e.preventDefault(); // 非同期通信に切り替える場合はこれを有効にする
        });
        
        // 💡 初期状態として表示モードに設定
        switchToDisplayMode(); 
    });

    // ------------------------------------------------------------------
    // --- 8. データが空の場合のレイアウト崩れ対策 ---
    // ------------------------------------------------------------------
    const allTables = document.querySelectorAll('.excel-table');
    const isMobileView = window.innerWidth <= 768; // 画面幅でモバイルビューを判定

    allTables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        // データ行（代替行クラスを持たない tr）をカウント
        const dataRows = Array.from(tbody.children).filter(tr => 
            !tr.classList.contains('no-data-row') && !tr.classList.contains('no-data-row-mobile')
        );
        
        const noDataRowPC = tbody.querySelector('.no-data-row');
        const noDataRowMobile = tbody.querySelector('.no-data-row-mobile');

        if (dataRows.length === 0) {
            // データ行が1つもない場合
            if (noDataRowPC) noDataRowPC.style.display = isMobileView ? 'none' : 'table-row';
            if (noDataRowMobile) noDataRowMobile.style.display = isMobileView ? 'table-row' : 'none';
            
            console.log(`データが空です。${isMobileView ? 'モバイル用代替行' : 'PC用代替行'}を表示しました。`);
        } else {
            // データ行がある場合、代替行を非表示
            if (noDataRowPC) noDataRowPC.style.display = 'none';
            if (noDataRowMobile) noDataRowMobile.style.display = 'none';
        }
    });

}); // DOMContentLoaded 終了 (2つ目)