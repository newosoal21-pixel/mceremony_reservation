package com.example.demo.controller;

// 標準Javaユーティリティ
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Jakarta Persistence (JPA)
import jakarta.persistence.EntityNotFoundException;

// Spring Framework
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// アプリケーション固有のモデルとリポジトリ、サービス
import com.example.demo.model.Parking;
import com.example.demo.model.ParkingStatus;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;
import com.example.demo.service.UpdateNotificationService; 

/**
 * 駐車場関連のREST APIを提供するコントローラークラス。
 * ベースパスは /api/parking
 */
@RestController
@RequestMapping("/api/parking")
public class ParkingApiController {

    // --- 依存性の注入 (DI) 対象フィールド ---
    private final ParkingRepository parkingRepository;
    private final ParkingStatusRepository parkingStatusRepository;
    private final UpdateNotificationService notificationService;
    
    // --- 定数フィールド ---
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    /**
     * コンストラクタインジェクション。
     * 必要なリポジトリと通知サービスをSpringコンテナから受け取る。
     */
    @Autowired
    public ParkingApiController(ParkingRepository parkingRepository,
                                ParkingStatusRepository parkingStatusRepository,
                                UpdateNotificationService notificationService) {
        this.parkingRepository = parkingRepository;
        this.parkingStatusRepository = parkingStatusRepository;
        this.notificationService = notificationService; 
    }
    
    // ----------------------------------------------------------------------
    // --- API エンドポイント定義 ---
    // ----------------------------------------------------------------------
    
    /**
     * GET /api/parking/statuses
     * 駐車場利用状況（ParkingStatus）のマスターデータをJSON形式で返す。
     * @return ParkingStatusのリスト
     */
    @GetMapping("/statuses")
    public List<ParkingStatus> getParkingStatusesApi() {
        // findAll()のデフォルトソート（通常はID順）で全件返す
        return parkingStatusRepository.findAll();
    }
    
    /**
     * POST /api/parking/update
     * 特定の駐車場予約レコードの単一フィールドを更新する。
     * 必要に応じて、出庫時刻（departureTime）も同時に更新する。
     * @param payload 更新対象のID、フィールド名、値を含むマップ
     * @return 成功メッセージまたはエラーメッセージを含むJSONマップ
     */
    @PostMapping("/update")
    @Transactional // トランザクション管理を有効化
    public ResponseEntity<Map<String, String>> updateParkingField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
        
        // リクエストボディからパラメータを取得
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        String extraField = payload.get("extraField"); // 付随する時刻フィールド名 (departureTimeを想定)
        String extraValueStr = payload.get("extraValue"); // 付随する時刻フィールドの値
        
        // 必須パラメータのチェック
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        try {
            // 1. IDで予約レコードを検索
            Integer id = Integer.parseInt(idStr);
            Optional<Parking> optionalParking = parkingRepository.findById(id);

            if (optionalParking.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの駐車予約が見つかりません。"));
            }

            Parking parking = optionalParking.get();
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
            String updateMessage = null; 
            String notificationValue = valueStr; // WebSocket通知用のメインフィールド値
            
            // --- 2. メインフィールドの更新処理 ---
            if ("parkingPermit".equals(field)) {
                // 駐車証No.
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setParkingPermit(valueToSet);
                updateMessage = "駐車証No.が更新されました。";
                notificationValue = valueToSet;
                
            } else if ("parkingPosition".equals(field)) {
                // 駐車位置
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setParkingPosition(valueToSet);
                updateMessage = "駐車位置が更新されました。";
                notificationValue = valueToSet;
                
            } else if ("carNumber".equals(field)) {
                // 車両ナンバー (必須)
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "車両ナンバーは必須です。"));
                }
                parking.setCarNumber(valueStr.trim());
                updateMessage = "車両ナンバーが更新されました。";
                notificationValue = valueStr.trim();
                
            } else if ("parkingStatus".equals(field)) { 
                // 駐車状況 (マスター参照)
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "利用状況は必須です。"));
                }
                
                Integer newStatusId = Integer.parseInt(valueStr); 
                Optional<ParkingStatus> optionalStatus = parkingStatusRepository.findById(newStatusId);
                
                if (optionalStatus.isEmpty()) {
                    // 参照整合性エラー: 存在しないParkingStatus ID
                    throw new EntityNotFoundException("ParkingStatus ID " + newStatusId + " が見つかりません");
                }
                
                ParkingStatus newStatus = optionalStatus.get();
                parking.setParkingStatus(newStatus);
                updateMessage = "駐車状況が「" + newStatus.getStatusName() + "」に更新されました。";
                notificationValue = valueStr; 
                
            } else if ("remarksColumn".equals(field)) {
                // 備考欄
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setRemarksColumn(valueToSet); 
                updateMessage = "備考欄が更新されました。";
                notificationValue = valueToSet;
                
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 3. 追加フィールド (出庫時刻) の更新処理 ---
            String notificationExtraValue = null; 
            
            if ("departureTime".equals(extraField)) {
                boolean isExtraValueBlank = (extraValueStr == null || extraValueStr.trim().isEmpty());
                
                if (isExtraValueBlank) {
                    // 値がない場合は時刻をクリア (NULL)
                    parking.setDepartureTime(null);
                    notificationExtraValue = ""; 
                } else {
                    try {
                        // 時刻文字列をパース
                        LocalDateTime newDepartureTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                        parking.setDepartureTime(newDepartureTime);
                        notificationExtraValue = extraValueStr; 
                    } catch (java.time.format.DateTimeParseException e) {
                        System.err.println("日付パースエラー: " + extraValueStr);
                        // 時刻データの形式が不正な場合は、メインフィールドの更新のみを続行する
                    }
                }
                
                // メッセージの統合
                if (updateMessage != null) {
                    updateMessage += " (出庫時刻も更新)"; 
                } else {
                    // メインフィールドの更新がなく、extraFieldのみが更新された場合
                    updateMessage = "出庫時刻が更新されました。"; 
                    field = extraField; // 通知フィールドをdepartureTimeに設定
                    notificationValue = ""; // メインフィールドの値は通知しない
                }
            }
            
            // 4. 最終更新時刻を設定して保存
            LocalDateTime currentUpdateTime = LocalDateTime.now();
            parking.setUpdateTime(currentUpdateTime);
            
            parkingRepository.save(parking);
            
            String updateTimeStr = currentUpdateTime.format(DATETIME_FORMATTER);
            
            // 5. WebSocket通知
            if (updateMessage != null && field != null) {
                // 更新内容をリアルタイムで全クライアントに通知する
                notificationService.notifyClients(
                    idStr, 
                    field, 
                    notificationValue, 
                    extraField, 
                    notificationExtraValue, 
                    updateTimeStr, 
                    "parking", // エンティティタイプを明示
                    updateMessage
                );
            }
            
            // 6. 成功レスポンス
            return ResponseEntity.ok(Map.of("status", "success", 
                                            "message", updateMessage, 
                                            "updateTime", updateTimeStr // 更新時刻をレスポンスに含める
                                            ));
            
        } catch (NumberFormatException e) {
            // IDや数値フィールドのパース失敗
            return ResponseEntity.badRequest().body(Map.of("message", "IDまたは更新値の形式が不正です。"));
        } catch (EntityNotFoundException e) {
            // 参照先のParkingStatusが見つからない場合など
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            // その他の予期せぬエラー
            System.err.println("DB更新エラー: " + e.getMessage());
            e.printStackTrace(); 
            return ResponseEntity.internalServerError().body(Map.of("message", "サーバー側で更新中にエラーが発生しました。"));
        }
    }
}