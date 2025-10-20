package com.example.demo.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter; // 💡 追加: 日時文字列のパース用
import java.util.Map;
import java.util.Optional;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.Parking;
import com.example.demo.model.ParkingStatus;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;

@RestController
@RequestMapping("/api/parking")
public class ParkingApiController {

    private final ParkingRepository parkingRepository;
    private final ParkingStatusRepository parkingStatusRepository;
    
    // 💡 追加: JavaScriptから送られてくる日付フォーマットを定義
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    @Autowired
    public ParkingApiController(ParkingRepository parkingRepository,
                                ParkingStatusRepository parkingStatusRepository) {
        this.parkingRepository = parkingRepository;
        this.parkingStatusRepository = parkingStatusRepository;
    }

    /**
     * 駐車証No.、駐車位置、車両ナンバー、利用状況、および出庫時刻を更新するAPIエンドポイント
     * @param payload {id: '1', field: '...', value: '...', extraField: 'departureTime', extraValue: '2025/10/20 23:40' or ''}
     */
    @PostMapping("/update")
    @Transactional 
    public ResponseEntity<Map<String, String>> updateParkingField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
        System.out.println("API受信データ - Field: " + payload.get("field"));
        System.out.println("API受信データ - Value: " + payload.get("value"));
        // 💡 追加: extraField/extraValueのデバッグ出力
        System.out.println("API受信データ - ExtraField: " + payload.get("extraField"));
        System.out.println("API受信データ - ExtraValue: " + payload.get("extraValue"));
    	
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        // 💡 追加: JavaScriptから送信された追加のフィールドと値を取得
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
            
            // --- メインフィールドの更新処理 ---
            if ("parkingPermit".equals(field)) {
                // 駐車証No. (String型) を更新
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setParkingPermit(valueToSet);
            } else if ("parkingPosition".equals(field)) {
                // 駐車位置 (String型) を更新
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setParkingPosition(valueToSet);
            } else if ("carNumber".equals(field)) {
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "車両ナンバーは必須です。"));
                }
                parking.setCarNumber(valueStr.trim());
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
                
            } else if ("remarksColumn".equals(field)) {
                // 備考欄 (String型) を更新
                String valueToSet = isValueBlank ? null : valueStr.trim();
                parking.setRemarksColumn(valueToSet); 
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 💡 追加: 追加フィールド (extraField) の更新処理 ---
            if ("departureTime".equals(extraField)) {
                boolean isExtraValueBlank = (extraValueStr == null || extraValueStr.trim().isEmpty());
                
                if (isExtraValueBlank) {
                    // JavaScriptから空文字が送られた場合、DBのdepartureTimeをNULLに設定
                    parking.setDepartureTime(null);
                } else {
                    // JavaScriptから時刻文字列が送られた場合、LocalDateTimeにパースして設定
                    try {
                        LocalDateTime newDepartureTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                        parking.setDepartureTime(newDepartureTime);
                    } catch (java.time.format.DateTimeParseException e) {
                        System.err.println("日付パースエラー: " + extraValueStr);
                        // 致命的ではないがログに出力
                    }
                }
            }
            // --- 💡 追加フィールド処理 終わり ---
            

            // 共通の更新日時をセット
            parking.setUpdateTime(LocalDateTime.now());
            
            // データベースに保存（更新）
            parkingRepository.save(parking);
            
            return ResponseEntity.ok(Map.of("status", "success", "message", "更新が完了しました。"));
            
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