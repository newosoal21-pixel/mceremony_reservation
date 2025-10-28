package com.example.demo.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.BusSituation;
import com.example.demo.model.ShuttleBusReservation;
import com.example.demo.repository.BusSituationRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.service.UpdateNotificationService; 


@RestController
@RequestMapping("/api/bus")
public class BusApiController {

    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final BusSituationRepository busSituationRepository;
    private final UpdateNotificationService notificationService;
    
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    @Autowired
    public BusApiController(ShuttleBusReservationRepository shuttleBusReservationRepository,
    		BusSituationRepository busSituationRepository,
            UpdateNotificationService notificationService) {
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.busSituationRepository = busSituationRepository;
        this.notificationService = notificationService; 
    }

    @GetMapping("/situations")
    public ResponseEntity<List<BusSituation>> getAllBusSituations() {
    	System.out.println("--- API呼び出し: /api/bus/situations がリクエストされました ---");
        List<BusSituation> situations = busSituationRepository.findAll(Sort.by("id").ascending());
        System.out.println("--- 取得された BusSituation の件数: " + situations.size() + " 件 ---");
        return ResponseEntity.ok(situations);
    }
    
    @PostMapping("/update")
    @Transactional 
    public ResponseEntity<Map<String, String>> updateBusField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
    	
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        String extraField = payload.get("extraField"); 
        String extraValueStr = payload.get("extraValue");
        
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        LocalDateTime now = LocalDateTime.now();
        String updateMessage = null; 
        
        try {
            Integer id = Integer.parseInt(idStr);
            Optional<ShuttleBusReservation> optionalBusReservation = shuttleBusReservationRepository.findById(id);

            if (optionalBusReservation.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの送迎バス予約が見つかりません。"));
            }

            ShuttleBusReservation shuttleBusReservation = optionalBusReservation.get();
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
            String notificationValue = valueStr; 
            
            // --- メインフィールドの更新処理 ---
            if ("busSituation".equals(field)) { 
                
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "入出庫状況は必須です。"));
                }
                
                Integer newStatusId = Integer.parseInt(valueStr); 
                Optional<BusSituation> optionalStatus = busSituationRepository.findById(newStatusId);
                
                if (optionalStatus.isEmpty()) {
                    throw new EntityNotFoundException("BusSituation ID " + newStatusId + " が見つかりません");
                }
                
                BusSituation newStatus = optionalStatus.get();
                shuttleBusReservation.setBusSituation(newStatus);
                
                updateMessage = "入出庫状況が「" + newStatus.getName() + "」に更新されました。";
                notificationValue = valueStr; 
                
            } else if ("remarksColumn".equals(field)) {
                String valueToSet = isValueBlank ? null : valueStr.trim();
                shuttleBusReservation.setRemarksColumn(valueToSet); 
                updateMessage = "備考欄が更新されました。";
                notificationValue = valueToSet; 
                
            } else if ("passengers".equals(field)) { 
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "乗車数は必須です。"));
                }
                
                try {
                    Integer passengerCount = Integer.parseInt(valueStr.trim());
                    
                    if (passengerCount < 0) {
                        return ResponseEntity.badRequest().body(Map.of("message", "乗車数に負の値を設定することはできません。"));
                    }
                    
                    shuttleBusReservation.setPassengers(passengerCount.shortValue());
                    updateMessage = "乗車数が「" + passengerCount + "」に更新されました。";
                    notificationValue = valueStr; 
                    
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(Map.of("message", "乗車数の値が数値として不正です。"));
                }
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 追加フィールド (時刻記録) の更新処理 ---
            String notificationExtraValue = null; 
            
            if (extraField != null) {
                boolean isExtraValueBlank = (extraValueStr == null || extraValueStr.trim().isEmpty());

                String extraMessage = null;
                
                if ("emptybusDepTime".equals(extraField)) {
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

                if (updateMessage == null && extraMessage != null) {
                    updateMessage = extraMessage;
                    field = extraField; 
                    notificationValue = ""; 
                } else if (updateMessage != null && extraMessage != null) {
                    updateMessage += " (" + extraMessage.replace("が更新されました。", "も更新") + ")";
                }
            }


            shuttleBusReservation.setUpdateTime(now);
            
            shuttleBusReservationRepository.save(shuttleBusReservation);
            
            String updateTimeStr = now.format(DATETIME_FORMATTER);
            
            // 💡 修正: WebSocketで全クライアントに更新を通知 (8引数)
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
            
            // 💡 修正: レスポンスに更新時刻を追加
            return ResponseEntity.ok(Map.of(
                "status", "success", 
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