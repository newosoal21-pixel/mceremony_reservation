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
     * @param payload {id: '1', field: 'parkingPermit'/'parkingPosition', value: '15'}
     */
    @PostMapping("/update")
    public ResponseEntity<Map<String, String>> updateParkingField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
        System.out.println("API受信データ - Field: " + payload.get("field"));
        System.out.println("API受信データ - Value: " + payload.get("value"));
    	
    	
        // 1. リクエストボディからデータ取得
        String idStr = payload.get("id");
        String field = payload.get("field");
        String value = payload.get("value");
        
        if (idStr == null || field == null || value == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データが不足しています。"));
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
            if ("parkingPermit".equals(field)) {
                // 駐車証No.を更新
                parking.setParkingPermit(value);
            } else if ("parkingPosition".equals(field)) {
                // 駐車位置を更新
                parking.setParkingPosition(value);
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // 4. データベースに保存（更新）
            parkingRepository.save(parking);
            
            return ResponseEntity.ok(Map.of("status", "success", "message", "更新が完了しました。"));
            
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "IDの形式が不正です。"));
        } catch (Exception e) {
            System.err.println("DB更新エラー: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("message", "サーバー側で更新中にエラーが発生しました。"));
        }
    }
}