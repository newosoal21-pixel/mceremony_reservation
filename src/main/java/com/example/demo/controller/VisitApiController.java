package com.example.demo.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

import com.example.demo.model.VisitSituation;
import com.example.demo.model.Visitor;
import com.example.demo.repository.VisitSituationRepository;
import com.example.demo.repository.VisitorRepository;
// 💡 WebSocket通知サービスをインポート
import com.example.demo.service.UpdateNotificationService; 


@RestController
@RequestMapping("/api/visitor")
public class VisitApiController { // クラス名は VisitApiController のままとしています

    private final VisitorRepository visitorRepository;
    private final VisitSituationRepository visitSituationRepository;
    private final UpdateNotificationService notificationService;
    
    // 💡 JavaScriptから送られてくる日付フォーマットを定義
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    @Autowired
    public VisitApiController(VisitorRepository visitorRepository,
    		VisitSituationRepository visitSituationRepository,
            UpdateNotificationService notificationService) {
        this.visitorRepository = visitorRepository;
        this.visitSituationRepository = visitSituationRepository;
        this.notificationService = notificationService; 
    }

    /**
     * 来館者データ (来館状況、備考欄、集計完了時刻) を更新するAPIエンドポイント
     */
    @PostMapping("/update")
    @Transactional 
    public ResponseEntity<Map<String, String>> updateVisitorField(@RequestBody Map<String, String> payload) {
        
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
            Optional<Visitor> optionalVisitor = visitorRepository.findById(id);

            if (optionalVisitor.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの来館者予約が見つかりません。"));
            }

            Visitor visitor = optionalVisitor.get();
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
            String updateMessage = null; 
            // 💡 追加: 通知用: クライアントに送るメインフィールドの最終値
            String notificationValue = valueStr; 
            
            // --- メインフィールドの更新処理 ---
            if ("visitSituation".equals(field)) { 
                
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "来館状況は必須です。"));
                }
                
                Integer newStatusId = Integer.parseInt(valueStr); 
                Optional<VisitSituation> optionalStatus = visitSituationRepository.findById(newStatusId);
                
                if (optionalStatus.isEmpty()) {
                    throw new EntityNotFoundException("VisitSituation ID " + newStatusId + " が見つかりません");
                }
                
                VisitSituation newStatus = optionalStatus.get();
                visitor.setVisitSituation(newStatus);
                updateMessage = "来館状況が「" + newStatus.getSituationName() + "」に更新されました。";
                notificationValue = valueStr; // 💡 状態IDを通知
                
            } else if ("remarksColumn".equals(field)) {
                // 備考欄 (String型) を更新
                String valueToSet = isValueBlank ? null : valueStr.trim();
                visitor.setRemarksColumn(valueToSet); 
                updateMessage = "備考欄が更新されました。";
                notificationValue = valueToSet; // 💡 設定された値を通知
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 💡 追加: 追加フィールド (extraField) の更新処理 ---
            // 💡 追加: 通知用: クライアントに送るExtraFieldの最終値
            String notificationExtraValue = null; 
            
            if ("compilationCmpTime".equals(extraField)) {
                boolean isExtraValueBlank = (extraValueStr == null || extraValueStr.trim().isEmpty());
                
                if (isExtraValueBlank) {
                    visitor.setCompilationCmpTime(null);
                    notificationExtraValue = ""; // 💡 クライアントに空文字列として通知 (リセット用)
                } else {
                    try {
                        LocalDateTime newCompilationCmpTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                        visitor.setCompilationCmpTime(newCompilationCmpTime);
                        notificationExtraValue = extraValueStr; // 💡 フォーマット済み時刻を通知
                    } catch (java.time.format.DateTimeParseException e) {
                        System.err.println("日付パースエラー: " + extraValueStr);
                    }
                }
                // 集計完了時刻の更新も通知対象とする
                if (updateMessage != null) {
                    updateMessage += " (集計完了時刻も更新)"; 
                } else {
                    // extraFieldのみが更新された場合
                    updateMessage = "集計完了時刻が更新されました。"; 
                    field = extraField; // 通知フィールドをcompilationCmpTimeに設定
                }
            }
            // --- 💡 追加フィールド処理 終わり ---
            

            // 共通の更新日時をセット
            LocalDateTime currentUpdateTime = LocalDateTime.now();
            visitor.setUpdateTime(currentUpdateTime);
            
            // データベースに保存（更新）
            visitorRepository.save(visitor);
            
            // 💡 最終更新時刻をクライアント形式に変換
            String updateTimeStr = currentUpdateTime.format(DATETIME_FORMATTER);
            
            // 💡 修正: WebSocketで全クライアントに更新を通知 (8引数)
            if (updateMessage != null && field != null) {
                // 💡 通知サービスに必要な全ての情報を渡す
                notificationService.notifyClients(
                    idStr, 
                    field, 
                    notificationValue, 
                    extraField, 
                    notificationExtraValue, 
                    updateTimeStr, 
                    "visitor", // 💡 エンティティタイプを 'visitor' に設定
                    updateMessage
                );
            }
            
            // 💡 修正: レスポンスに更新時刻を追加
            return ResponseEntity.ok(Map.of("status", "success", 
                                            "message", updateMessage, 
                                            "updateTime", updateTimeStr // 更新時刻を返す
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