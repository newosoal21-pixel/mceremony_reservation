package com.example.demo.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException; // 新規追加
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

import com.example.demo.model.BusSituation;
import com.example.demo.model.ShuttleBusReservation;
import com.example.demo.repository.BusSituationRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;


@RestController
@RequestMapping("/api/bus")
public class BusApiController {

    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final BusSituationRepository busSituationRepository;
    
    // JS側 (common.js) の formatDate 関数と一致するフォーマットを定義
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    @Autowired
    public BusApiController(ShuttleBusReservationRepository shuttleBusReservationRepository,
    		BusSituationRepository busSituationRepository) {
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.busSituationRepository = busSituationRepository;
    }

    /**
     * 入出庫状況 (BusSituation) の全リストを返すAPIエンドポイント
     * @return List<BusSituation> 全状況のリスト
     */
    @GetMapping("/situations")
    public ResponseEntity<List<BusSituation>> getAllBusSituations() {
    	System.out.println("--- API呼び出し: /api/bus/situations がリクエストされました ---");
        
        List<BusSituation> situations = busSituationRepository.findAll();
        
        System.out.println("--- 取得された BusSituation の件数: " + situations.size() + " 件 ---");
        
        return ResponseEntity.ok(situations);
    }
    
    /**
     * 送迎バス予約リストの各種フィールド（備考欄、入出庫状況、乗車数）を更新するAPIエンドポイント
     * @param payload {id: '1', field: 'remarksColumn' or 'busSituation' or 'passengers', value: '...' 
     * [, extraField: 'emptybusDepTime' or 'departureTime', extraValue: 'yyyy/MM/dd HH:mm']}
     */
    @PostMapping("/update")
    @Transactional 
    public ResponseEntity<Map<String, String>> updateBusField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
        System.out.println("API受信データ - Field: " + payload.get("field"));
        System.out.println("API受信データ - Value: " + payload.get("value"));
        System.out.println("API受信データ - ExtraField: " + payload.get("extraField"));
        System.out.println("API受信データ - ExtraValue: " + payload.get("extraValue")); // デバッグ用
    	
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        // 🚀 [修正1] extraField/Value の取得
        String extraField = payload.get("extraField"); 
        String extraValueStr = payload.get("extraValue");
        
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        // 更新日時を取得
        LocalDateTime now = LocalDateTime.now();
        
        try {
            Integer id = Integer.parseInt(idStr);
            Optional<ShuttleBusReservation> optionalBusReservation = shuttleBusReservationRepository.findById(id);

            if (optionalBusReservation.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの送迎バス予約が見つかりません。"));
            }

            ShuttleBusReservation shuttleBusReservation = optionalBusReservation.get();
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
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
                
            } else if ("remarksColumn".equals(field)) {
                // 備考欄 (String型) を更新
                String valueToSet = isValueBlank ? null : valueStr.trim();
                shuttleBusReservation.setRemarksColumn(valueToSet); 
                
            } else if ("passengers".equals(field)) { 
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "乗車数は必須です。"));
                }
                
                try {
                    // 数値に変換してチェック
                    Integer passengerCount = Integer.parseInt(valueStr.trim());
                    
                    if (passengerCount < 0) {
                        return ResponseEntity.badRequest().body(Map.of("message", "乗車数に負の値を設定することはできません。"));
                    }
                    
                    // Short型に変換してセット
                    shuttleBusReservation.setPassengers(passengerCount.shortValue());
                    
                } catch (NumberFormatException e) {
                    return ResponseEntity.badRequest().body(Map.of("message", "乗車数の値が数値として不正です。"));
                }
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // -------------------------------------------------------------
            // 🚀 [修正2] extraField (時刻記録) の更新処理
            // -------------------------------------------------------------
            if (extraField != null && extraValueStr != null && !extraValueStr.trim().isEmpty()) {
                try {
                    // 時刻文字列を LocalDateTime に変換
                    LocalDateTime extraTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                    
                    if ("emptybusDepTime".equals(extraField)) {
                        System.out.println("---時刻格納: emptybusDepTime に " + extraValueStr + " をセット---");
                        shuttleBusReservation.setEmptybusDepTime(extraTime);
                        
                    } else if ("departureTime".equals(extraField)) {
                        System.out.println("---時刻格納: departureTime に " + extraValueStr + " をセット---");
                        shuttleBusReservation.setDepartureTime(extraTime);
                        
                    } else {
                        System.err.println("WARN: 未知の extraField: " + extraField + " は無視されました。");
                    }
                    
                } catch (DateTimeParseException e) {
                    System.err.println("ERROR: 日付時刻文字列のパースに失敗しました: " + extraValueStr);
                    return ResponseEntity.badRequest().body(Map.of("message", "時刻データの形式が不正です。"));
                }
            }


            // 共通の更新日時をセット
            shuttleBusReservation.setUpdateTime(now);
            
            // データベースに保存（更新）
            shuttleBusReservationRepository.save(shuttleBusReservation);
            
            // 💡 修正: クライアント側で最終更新時刻の表示を更新できるよう、時刻文字列を返す
            // サーバー側でフォーマットした時刻を返すことで、クライアント側はより正確な時刻を取得できる
            String updateTimeStr = now.format(DATETIME_FORMATTER);
            
            return ResponseEntity.ok(Map.of(
                "status", "success", 
                "message", "更新が完了しました。",
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