package com.example.demo.controller;

// 標準Javaユーティリティ
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

// Jakarta Persistence (JPA)
import jakarta.persistence.EntityNotFoundException;

// Spring Framework
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// アプリケーション固有のモデルとリポジトリ、サービス
import com.example.demo.model.VisitSituation;
import com.example.demo.model.Visitor;
import com.example.demo.repository.VisitSituationRepository;
import com.example.demo.repository.VisitorRepository;
import com.example.demo.service.UpdateNotificationService; 


/**
 * 来館者関連のREST APIを提供するコントローラークラス。
 * ベースパスは /api/visitor
 */
@RestController
@RequestMapping("/api/visitor")
public class VisitApiController {

    // --- 依存性の注入 (DI) 対象フィールド ---
    private final VisitorRepository visitorRepository;
    private final VisitSituationRepository visitSituationRepository;
    private final UpdateNotificationService notificationService;
    
    // --- 定数フィールド ---
    // クライアントとの間でやり取りする日付時刻フォーマット
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");


    /**
     * コンストラクタインジェクション。
     * 必要なリポジトリと通知サービスをSpringコンテナから受け取る。
     */
    @Autowired
    public VisitApiController(VisitorRepository visitorRepository,
    		VisitSituationRepository visitSituationRepository,
            UpdateNotificationService notificationService) {
        this.visitorRepository = visitorRepository;
        this.visitSituationRepository = visitSituationRepository;
        this.notificationService = notificationService; 
    }

    // ----------------------------------------------------------------------
    // --- API エンドポイント定義 ---
    // ----------------------------------------------------------------------

    /**
     * POST /api/visitor/update
     * 特定の来館者レコードの単一フィールドを更新する。
     * 主に「来館状況」「備考欄」「集計完了時刻」の更新に使用される。
     * @param payload 更新対象のID、フィールド名、値を含むマップ
     * @return 成功メッセージまたはエラーメッセージを含むJSONマップ
     */
    @PostMapping("/update")
    @Transactional // トランザクション管理を有効化
    public ResponseEntity<Map<String, String>> updateVisitorField(@RequestBody Map<String, String> payload) {
        
    	System.out.println("API受信データ - ID: " + payload.get("id"));
    	
        // リクエストボディからパラメータを取得
        String idStr = payload.get("id");
        String field = payload.get("field");
        String valueStr = payload.get("value"); 
        
        String extraField = payload.get("extraField"); // 付随する時刻フィールド名 (compilationCmpTimeを想定)
        String extraValueStr = payload.get("extraValue"); // 付随する時刻フィールドの値
        
        // 必須パラメータのチェック
        if (idStr == null || field == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "必須データ（IDまたはフィールド名）が不足しています。"));
        }
        
        try {
            // 1. IDで来館者レコードを検索
            Integer id = Integer.parseInt(idStr);
            Optional<Visitor> optionalVisitor = visitorRepository.findById(id);

            if (optionalVisitor.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "指定されたIDの来館者予約が見つかりません。"));
            }

            Visitor visitor = optionalVisitor.get();
            boolean isValueBlank = (valueStr == null || valueStr.trim().isEmpty());
            
            String updateMessage = null; 
            String notificationValue = valueStr; // WebSocket通知用のメインフィールド値
            
            // --- 2. メインフィールドの更新処理 ---
            if ("visitSituation".equals(field)) { 
                // 来館状況の更新 (マスター参照)
                if (isValueBlank) {
                    return ResponseEntity.badRequest().body(Map.of("message", "来館状況は必須です。"));
                }
                
                Integer newStatusId = Integer.parseInt(valueStr); 
                Optional<VisitSituation> optionalStatus = visitSituationRepository.findById(newStatusId);
                
                if (optionalStatus.isEmpty()) {
                    // 参照整合性エラー: 存在しないVisitSituation ID
                    throw new EntityNotFoundException("VisitSituation ID " + newStatusId + " が見つかりません");
                }
                
                VisitSituation newStatus = optionalStatus.get();
                visitor.setVisitSituation(newStatus);
                updateMessage = "来館状況が「" + newStatus.getSituationName() + "」に更新されました。";
                notificationValue = valueStr; // 状態IDを通知
                
            } else if ("remarksColumn".equals(field)) {
                // 備考欄の更新 (String型)
                String valueToSet = isValueBlank ? null : valueStr.trim();
                visitor.setRemarksColumn(valueToSet); 
                updateMessage = "備考欄が更新されました。";
                notificationValue = valueToSet; // 設定された値を通知
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "無効なフィールド名です。"));
            }

            // --- 3. 追加フィールド (集計完了時刻) の更新処理 ---
            String notificationExtraValue = null; 
            
            if ("compilationCmpTime".equals(extraField)) {
                boolean isExtraValueBlank = (extraValueStr == null || extraValueStr.trim().isEmpty());
                
                if (isExtraValueBlank) {
                    // 値がない場合は時刻をクリア (NULL)
                    visitor.setCompilationCmpTime(null);
                    notificationExtraValue = ""; // クライアントに空文字列として通知 (リセット用)
                } else {
                    try {
                        // 時刻文字列をパース
                        LocalDateTime newCompilationCmpTime = LocalDateTime.parse(extraValueStr, DATETIME_FORMATTER);
                        visitor.setCompilationCmpTime(newCompilationCmpTime);
                        notificationExtraValue = extraValueStr; // フォーマット済み時刻を通知
                    } catch (java.time.format.DateTimeParseException e) {
                        System.err.println("日付パースエラー: " + extraValueStr);
                        // パース失敗時は更新しない
                    }
                }
                
                // メッセージの統合
                if (updateMessage != null) {
                    updateMessage += " (集計完了時刻も更新)"; 
                } else {
                    // extraFieldのみが更新された場合
                    updateMessage = "集計完了時刻が更新されました。"; 
                    field = extraField; // 通知フィールドをcompilationCmpTimeに設定
                    notificationValue = ""; 
                }
            }
            
            // 4. 最終更新時刻を設定して保存
            LocalDateTime currentUpdateTime = LocalDateTime.now();
            visitor.setUpdateTime(currentUpdateTime);
            
            visitorRepository.save(visitor);
            
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
                    "visitor", // エンティティタイプを明示
                    updateMessage
                );
            }
            
            // 6. 成功レスポンス
            return ResponseEntity.ok(Map.of("status", "success", 
                                            "message", updateMessage, 
                                            "updateTime", updateTimeStr // 更新時刻を返す
                                            ));
            
        } catch (NumberFormatException e) {
            // IDや数値フィールドのパース失敗
            return ResponseEntity.badRequest().body(Map.of("message", "IDまたは更新値の形式が不正です。"));
        } catch (EntityNotFoundException e) {
            // 参照先のVisitSituationが見つからない場合など
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            // その他の予期せぬエラー
            System.err.println("DB更新エラー: " + e.getMessage());
            e.printStackTrace(); 
            return ResponseEntity.internalServerError().body(Map.of("message", "サーバー側で更新中にエラーが発生しました。"));
        }
    }
}