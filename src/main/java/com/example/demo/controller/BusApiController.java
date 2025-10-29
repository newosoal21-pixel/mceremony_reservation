package com.example.demo.controller;

// 標準Javaユーティリティ
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Jakarta Persistence (JPA)
import jakarta.persistence.EntityNotFoundException;

// Spring Framework
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// アプリケーション固有のモデルとリポジトリ、サービス
import com.example.demo.model.BusSituation;
import com.example.demo.model.ShuttleBusReservation;
import com.example.demo.repository.BusSituationRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.service.UpdateNotificationService; 


/**
 * 送迎バス関連のREST APIを提供するコントローラークラス。
 * ベースパスは /api/bus
 */
@RestController
@RequestMapping("/api/bus")
public class BusApiController {

    // --- 依存性の注入 (DI) 対象フィールド ---
    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final BusSituationRepository busSituationRepository;
    private final UpdateNotificationService notificationService;
    
    // --- 定数フィールド ---
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    /**
     * コンストラクタインジェクション。
     * 必要なリポジトリとサービスをSpringコンテナから受け取る。
     */
    @Autowired
    public BusApiController(
        ShuttleBusReservationRepository shuttleBusReservationRepository,
        BusSituationRepository busSituationRepository,
        UpdateNotificationService notificationService) {
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.busSituationRepository = busSituationRepository;
        this.notificationService = notificationService; 
    }

    // ----------------------------------------------------------------------
    // --- API エンドポイント定義 ---
    // ----------------------------------------------------------------------

    /**
     * GET /api/bus/situations
     * 全てのバス状況ステータス（BusSituation）を取得する。
     * @return 昇順にソートされた BusSituation のリスト
     */
    @GetMapping("/situations")
    public ResponseEntity<List<BusSituation>> getAllBusSituations() {
    	System.out.println("--- API呼び出し: /api/bus/situations がリクエストされました ---");
        // IDで昇順ソートして全件取得
        List<BusSituation> situations = busSituationRepository.findAll(Sort.by("id").ascending());
        System.out.println("--- 取得された BusSituation の件数: " + situations.size() + " 件 ---");
        return ResponseEntity.ok(situations);
    }
    
    /**
     * POST /api/bus/update
     * 特定の送迎バス予約（ShuttleBusReservation）レコードの単一フィールドを更新する。
     * 必要に応じて、付随する時刻フィールドも同時に更新する。
     * @param payload 更新対象のID、フィールド名、値を含むマップ
     * @return 成功メッセージまたはエラーメッセージを含むJSONマップ
     */
    @PostMapping("/update")
    @Transactional // トランザクション管理を有効化
    public ResponseEntity<Map<String, String>> updateBusField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
    	
        // リクエストボディからパラメータを取得
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        String extraField = payload.get("extraField"); // 付随する時刻フィールド名
        String extraValueStr = payload.get("extraValue"); // 付随する時刻フィールドの値
        
        // 必須パラメータのチェック
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        LocalDateTime now = LocalDateTime.now();
        String updateMessage = null; // ユーザーへのフィードバックメッセージ
        
        try {
            // 1. IDで予約レコードを検索
            Integer id = Integer.parseInt(idStr);
            Optional<ShuttleBusReservation> optionalBusReservation = shuttleBusReservationRepository.findById(id);

            if (optionalBusReservation.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの送迎バス予約が見つかりません。"));
            }

            ShuttleBusReservation shuttleBusReservation = optionalBusReservation.get();
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
            String notificationValue = valueStr; // WebSocket通知用の値
            
            // --- 2. メインフィールドの更新処理 ---
            if ("busSituation".equals(field)) { 
                // バス状況の更新
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "入出庫状況は必須です。"));
                }
                
                Integer newStatusId = Integer.parseInt(valueStr); 
                Optional<BusSituation> optionalStatus = busSituationRepository.findById(newStatusId);
                
                if (optionalStatus.isEmpty()) {
                    // 参照整合性エラー: 存在しないBusSituation ID
                    throw new EntityNotFoundException("BusSituation ID " + newStatusId + " が見つかりません");
                }
                
                BusSituation newStatus = optionalStatus.get();
                shuttleBusReservation.setBusSituation(newStatus);
                
                updateMessage = "入出庫状況が「" + newStatus.getName() + "」に更新されました。";
                notificationValue = valueStr; 
                
            } else if ("remarksColumn".equals(field)) {
                // 備考欄の更新
                String valueToSet = isValueBlank ? null : valueStr.trim();
                shuttleBusReservation.setRemarksColumn(valueToSet); 
                updateMessage = "備考欄が更新されました。";
                notificationValue = valueToSet; 
                
            } else if ("passengers".equals(field)) { 
                // 乗車数の更新
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "乗車数は必須です。"));
                }
                
                try {
                    Integer passengerCount = Integer.parseInt(valueStr.trim());
                    
                    if (passengerCount < 0) {
                        return ResponseEntity.badRequest().body(Map.of("message", "乗車数に負の値を設定することはできません。"));
                    }
                    
                    // shortValue()でShort型に変換して設定
                    shuttleBusReservation.setPassengers(passengerCount.shortValue());
                    updateMessage = "乗車数が「" + passengerCount + "」に更新されました。";
                    notificationValue = valueStr; 
                    
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(Map.of("message", "乗車数の値が数値として不正です。"));
                }
            } else {
                // 無効なフィールド名
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 3. 追加フィールド (時刻記録) の更新処理 ---
            String notificationExtraValue = null; 
            
            if (extraField != null) {
                boolean isExtraValueBlank = (extraValueStr == null || extraValueStr.trim().isEmpty());

                String extraMessage = null;
                
                if ("emptybusDepTime".equals(extraField)) {
                    // 下車済バス出庫時刻
                    if (isExtraValueBlank) {
                        shuttleBusReservation.setEmptybusDepTime(null);
                        extraMessage = "下車済バス出庫時刻がクリアされました。";
                        notificationExtraValue = ""; 
                    } else {
                        try {
                            LocalDateTime extraTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                            shuttleBusReservation.setEmptybusDepTime(extraTime);
                            extraMessage = "下車済バス出庫時刻が更新されました。";
                            notificationExtraValue = extraValueStr; 
                        } catch (DateTimeParseException e) {
                            System.err.println("ERROR: 日付時刻文字列のパースに失敗しました: " + extraValueStr);
                            return ResponseEntity.badRequest().body(Map.of("message", "時刻データの形式が不正です。"));
                        }
                    }
                    
                } else if ("departureTime".equals(extraField)) {
                    // 乗車済バス出庫時刻
                    if (isExtraValueBlank) {
                        shuttleBusReservation.setDepartureTime(null);
                        extraMessage = "乗車済バス出庫時刻がクリアされました。";
                        notificationExtraValue = ""; 
                    } else {
                        try {
                            LocalDateTime extraTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                            shuttleBusReservation.setDepartureTime(extraTime);
                            extraMessage = "乗車済バス出庫時刻が更新されました。";
                            notificationExtraValue = extraValueStr; 
                        } catch (DateTimeParseException e) {
                            System.err.println("ERROR: 日付時刻文字列のパースに失敗しました: " + extraValueStr);
                            return ResponseEntity.badRequest().body(Map.of("message", "時刻データの形式が不正です。"));
                        }
                    }
                }

                // メッセージの結合
                if (updateMessage == null && extraMessage != null) {
                    // メインフィールドの更新がない場合
                    updateMessage = extraMessage;
                    field = extraField; 
                    notificationValue = ""; 
                } else if (updateMessage != null && extraMessage != null) {
                    // メインフィールドと時刻フィールドの両方更新があった場合
                    updateMessage += " (" + extraMessage.replace("が更新されました。", "も更新") + ")";
                }
            }


            // 4. 最終更新時刻を設定して保存
            shuttleBusReservation.setUpdateTime(now);
            shuttleBusReservationRepository.save(shuttleBusReservation);
            
            String updateTimeStr = now.format(DATETIME_FORMATTER);
            
            // 5. WebSocket通知
            if (updateMessage != null && field != null) {
                 notificationService.notifyClients(
                    idStr, 
                    field, 
                    notificationValue, 
                    extraField, 
                    notificationExtraValue, 
                    updateTimeStr, 
                    "bus", 
                    updateMessage
                );
            }
            
            // 6. 成功レスポンス
            return ResponseEntity.ok(Map.of(
                "status", "success", 
                "message", updateMessage,
                "updateTime", updateTimeStr // 更新時刻をレスポンスに含める
            ));
            
        } catch (NumberFormatException e) {
            // IDや数値フィールドのパース失敗
            return ResponseEntity.badRequest().body(Map.of("message", "IDまたは更新値の形式が不正です。"));
        } catch (EntityNotFoundException e) {
            // 参照先のBusSituationが見つからない場合など
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            // その他の予期せぬエラー
            System.err.println("DB更新エラー: " + e.getMessage());
            e.printStackTrace(); 
            return ResponseEntity.internalServerError().body(Map.of("message", "サーバー側で更新中にエラーが発生しました。"));
        }
    }
}