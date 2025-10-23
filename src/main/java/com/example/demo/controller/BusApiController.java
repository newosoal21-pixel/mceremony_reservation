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

import com.example.demo.model.BusSituation;
import com.example.demo.model.ShuttleBusReservation;
import com.example.demo.repository.BusSituationRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;


@RestController
@RequestMapping("/api/bus")
public class BusApiController {

    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final BusSituationRepository busSituationRepository;
    
    // 💡 注意: 備考欄更新に直接は不要だが、他の更新ロジックのために残します。
    // 使用されなくなった extraField/Value のパース用にも残しています。
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
    @GetMapping("/situations") // 💡 新しいエンドポイント
    public ResponseEntity<List<BusSituation>> getAllBusSituations() {
    	// 💡 【修正点】APIが呼び出されたことを確認するためのログを追加
    	System.out.println("--- API呼び出し: /api/bus/situations がリクエストされました ---");
    	
        // JpaRepository の findAll() メソッドを使用して全データを取得
        List<BusSituation> situations = busSituationRepository.findAll();
        
        // 💡 【修正点】取得したデータ数をログに出力して確認
        System.out.println("--- 取得された BusSituation の件数: " + situations.size() + " 件 ---");
        
        // 成功レスポンスとしてリストを返す
        return ResponseEntity.ok(situations);
    }
    
    /**
     * 送迎バス予約リストの各種フィールド（備考欄、入出庫状況など）を更新するAPIエンドポイント
     * @param payload {id: '1', field: 'remarksColumn' or 'busSituation', value: '...' }
     */
    @PostMapping("/update")
    @Transactional 
    public ResponseEntity<Map<String, String>> updateBusField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
        System.out.println("API受信データ - Field: " + payload.get("field"));
        System.out.println("API受信データ - Value: " + payload.get("value"));
    	
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        // 備考欄の更新では extraField/extraValue は使用しませんが、他の更新ロジックのために取得だけ残します。
        // （ロジック自体は削除済み）
        String extraField = payload.get("extraField"); 
        String extraValueStr = payload.get("extraValue");
        
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        try {
            Integer id = Integer.parseInt(idStr);
            // 修正: 変数名を optionalBusReservation に変更
            Optional<ShuttleBusReservation> optionalBusReservation = shuttleBusReservationRepository.findById(id);

            if (optionalBusReservation.isEmpty()) {
                // メッセージを ShuttlBusReservation に変更
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの送迎バス予約が見つかりません。"));
            }

            // 修正: 変数名を shuttleBusReservation に変更
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
                // 修正: 変数名を shuttleBusReservation に変更
                shuttleBusReservation.setBusSituation(newStatus);
                
            } else if ("remarksColumn".equals(field)) {
                // 備考欄 (String型) を更新
                String valueToSet = isValueBlank ? null : valueStr.trim();
                shuttleBusReservation.setRemarksColumn(valueToSet); 
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 追加フィールドの更新処理は備考欄更新に不要なため削除 ---
            
            // 共通の更新日時をセット
            // 💡 修正: モデルに setUpdateTime() を追加したため、ここでコンパイルが通ります
            shuttleBusReservation.setUpdateTime(LocalDateTime.now());
            
            // データベースに保存（更新）
            // 修正: 変数名を shuttleBusReservation に変更
            shuttleBusReservationRepository.save(shuttleBusReservation);
            
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