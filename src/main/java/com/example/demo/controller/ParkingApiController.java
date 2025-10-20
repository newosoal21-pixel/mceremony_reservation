package com.example.demo.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.Parking;
import com.example.demo.repository.ParkingRepository;

@RestController // REST APIのコントローラーとして定義
@RequestMapping("/api/parking") // JavaScriptのfetch先と合わせる
public class ParkingApiController {

    private final ParkingRepository parkingRepository;

    @Autowired
    public ParkingApiController(ParkingRepository parkingRepository) {
        this.parkingRepository = parkingRepository;
    }

    /**
     * 駐車証No.または駐車位置を更新するAPIエンドポイント
     * @param payload {id: '1', field: 'parkingPermit'/'parkingPosition', value: '15' または ''}
     */
    @PostMapping("/update")
    public ResponseEntity<Map<String, String>> updateParkingField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
        System.out.println("API受信データ - Field: " + payload.get("field"));
        System.out.println("API受信データ - Value: " + payload.get("value"));
    	
    	
        // 1. リクエストボディからデータ取得
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        try {
            // IDはInteger型として処理
            Integer id = Integer.parseInt(idStr);
            
            // 2. IDに基づいてエンティティを検索
            Optional<Parking> optionalParking = parkingRepository.findById(id);

            if (optionalParking.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの駐車予約が見つかりません。"));
            }

            Parking parking = optionalParking.get();
            
            // 3. フィールド名に応じて対応するプロパティを更新
            
            // 値が空文字またはnullであるかチェック
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
            // データベースのString型フィールドに設定する値
            // JavaScriptから空文字が送られてきた場合、それをnullとして扱う
            String valueToSet = isValueBlank ? null : valueStr.trim();
            
            if ("parkingPermit".equals(field)) {
                // 駐車証No.を更新
                // ✅ 修正点: Integerに変換せず、String型のvalueToSetを設定
                parking.setParkingPermit(valueToSet);
            } else if ("parkingPosition".equals(field)) {
                // 駐車位置を更新
                // ✅ 修正点: Integerに変換せず、String型のvalueToSetを設定
                parking.setParkingPosition(valueToSet);
            } else {
                // 他のフィールド処理（もしあれば）...
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // 4. データベースに保存（更新）
            parkingRepository.save(parking);
            
            return ResponseEntity.ok(Map.of("status", "success", "message", "更新が完了しました。"));
            
        } catch (NumberFormatException e) {
            // IDのInteger変換で失敗した場合のみここに来る（更新値はString型になったため）
            return ResponseEntity.badRequest().body(Map.of("message", "IDの形式が不正です。"));
        } catch (Exception e) {
            System.err.println("DB更新エラー: " + e.getMessage());
            e.printStackTrace(); 
            return ResponseEntity.internalServerError().body(Map.of("message", "サーバー側で更新中にエラーが発生しました。"));
        }
    }
}