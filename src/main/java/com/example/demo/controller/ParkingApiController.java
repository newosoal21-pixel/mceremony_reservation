package com.example.demo.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.Parking;
import com.example.demo.model.ParkingStatus;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;
// 💡 追加: WebSocket通知サービスをインポート
import com.example.demo.service.UpdateNotificationService; 

@RestController
@RequestMapping("/api/parking")
public class ParkingApiController {

    private final ParkingRepository parkingRepository;
    private final ParkingStatusRepository parkingStatusRepository;
    // 💡 修正: 通知サービスをメンバ変数として定義
    private final UpdateNotificationService notificationService;
    
    // 💡 修正: 日時フォーマッタを定義
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    @Autowired
    public ParkingApiController(ParkingRepository parkingRepository,
                                ParkingStatusRepository parkingStatusRepository,
                                // 💡 修正: 通知サービスをコンストラクタに追加
                                UpdateNotificationService notificationService) {
        this.parkingRepository = parkingRepository;
        this.parkingStatusRepository = parkingStatusRepository;
        this.notificationService = notificationService; // 💡 注入
    }
    
    /**
     * 駐車場利用状況の選択肢データをJSON形式で返すAPIエンドポイント。
     */
    @GetMapping("/statuses")
    public List<ParkingStatus> getParkingStatusesApi() {
        return parkingStatusRepository.findAll();
    }
    
    /**
     * 駐車証No.、駐車位置、車両ナンバー、利用状況、および出庫時刻を更新するAPIエンドポイント
     */
    @PostMapping("/update")
    @Transactional 
    public ResponseEntity<Map<String, String>> updateParkingField(@RequestBody Map<String, String> payload) {
        
    	// デバッグログの出力（省略可）
    	System.out.println("API受信データ - ID: " + payload.get("id"));
        
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        String extraField = payload.get("extraField");
        String extraValueStr = payload.get("extraValue");
        
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        try {
            Integer id = Integer.parseInt(idStr);
            Optional<Parking> optionalParking = parkingRepository.findById(id);

            if (optionalParking.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの駐車予約が見つかりません。"));
            }

            Parking parking = optionalParking.get();
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
            String updateMessage = null; 
            // 💡 通知用: クライアントに送るメインフィールドの最終値
            String notificationValue = valueStr; 
            
            // --- メインフィールドの更新処理 ---
            if ("parkingPermit".equals(field)) {
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setParkingPermit(valueToSet);
                updateMessage = "駐車証No.が更新されました。";
                notificationValue = valueToSet;
                
            } else if ("parkingPosition".equals(field)) {
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setParkingPosition(valueToSet);
                updateMessage = "駐車位置が更新されました。";
                notificationValue = valueToSet;
                
            } else if ("carNumber".equals(field)) {
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "車両ナンバーは必須です。"));
                }
                parking.setCarNumber(valueStr.trim());
                updateMessage = "車両ナンバーが更新されました。";
                notificationValue = valueStr.trim();
                
            } else if ("parkingStatus".equals(field)) { 
                
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "利用状況は必須です。"));
                }
                
                Integer newStatusId = Integer.parseInt(valueStr); 
                Optional<ParkingStatus> optionalStatus = parkingStatusRepository.findById(newStatusId);
                
                if (optionalStatus.isEmpty()) {
                    throw new EntityNotFoundException("ParkingStatus ID " + newStatusId + " が見つかりません");
                }
                
                ParkingStatus newStatus = optionalStatus.get();
                parking.setParkingStatus(newStatus);
                updateMessage = "駐車状況が「" + newStatus.getStatusName() + "」に更新されました。";
                // 💡 ParkingStatusの場合はID (valueStr) を通知
                notificationValue = valueStr; 
                
            } else if ("remarksColumn".equals(field)) {
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setRemarksColumn(valueToSet); 
                updateMessage = "備考欄が更新されました。";
                notificationValue = valueToSet;
                
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 💡 追加: 追加フィールド (extraField) の更新処理 ---
            // 💡 通知用: クライアントに送るExtraFieldの最終値
            String notificationExtraValue = null; 
            
            if ("departureTime".equals(extraField)) {
                boolean isExtraValueBlank = (extraValueStr == null || extraValueStr.trim().isEmpty());
                
                if (isExtraValueBlank) {
                    parking.setDepartureTime(null);
                    notificationExtraValue = ""; // クライアントに空文字列として通知 (リセット用)
                } else {
                    try {
                        // クライアントから送られてきた時刻文字列をパース
                        LocalDateTime newDepartureTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                        parking.setDepartureTime(newDepartureTime);
                        notificationExtraValue = extraValueStr; // クライアントにフォーマット済み時刻を通知
                    } catch (java.time.format.DateTimeParseException e) {
                        System.err.println("日付パースエラー: " + extraValueStr);
                        // パース失敗時は更新しない (例外はthrowせず、通知データには影響なしとする)
                    }
                }
                // 出庫時刻の更新も通知対象とする (メインフィールドの通知メッセージに追加)
                if (updateMessage != null) {
                    updateMessage += " (出庫時刻も更新)"; 
                } else {
                    // もしextraFieldのみが更新された場合
                    updateMessage = "出庫時刻が更新されました。"; 
                    field = extraField; // 通知フィールドをdepartureTimeに設定
                    // notificationValue は空で良い
                }
            }
            // --- 💡 追加フィールド処理 終わり ---
            

            // 共通の更新日時をセット
            LocalDateTime currentUpdateTime = LocalDateTime.now();
            parking.setUpdateTime(currentUpdateTime);
            
            // データベースに保存（更新）
            parkingRepository.save(parking);
            
            // 💡 最終更新時刻をクライアント形式に変換
            String updateTimeStr = currentUpdateTime.format(DATETIME_FORMATTER);
            
            // 💡 修正: WebSocketで全クライアントに更新を通知
            if (updateMessage != null && field != null) {
                
                // 💡 通知サービスに必要な全ての情報を渡す
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
            
            // 💡 修正: レスポンスに更新時刻を追加
            return ResponseEntity.ok(Map.of("status", "success", 
                                            "message", updateMessage, 
                                            "updateTime", updateTimeStr 
                                            ));
            
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "IDまたは更新値の形式が不正です。"));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            System.err.println("DB更新エラー: " + e.getMessage());
            e.printStackTrace(); 
            return ResponseEntity.internalServerError().body(Map.of("message", "サーバー側で更新中にエラーが発生しました。"));
        }
    }
}