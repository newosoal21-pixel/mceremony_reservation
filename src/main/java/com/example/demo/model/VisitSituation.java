package com.example.demo.model;

import jakarta.persistence.Column; 
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.GeneratedValue; // 必要に応じて追加
import jakarta.persistence.GenerationType; // 必要に応じて追加

@Entity 
@Table(name = "visit_situations")
public class VisitSituation {

    @Id
    // @GeneratedValue(strategy = GenerationType.IDENTITY) // 自動生成の場合
    @Column(name = "visit_situation_id") 
    private Integer situationId; 
    
    @Column(name = "visit_situations_name") 
    private String situationName;

    // ----- Thymeleaf/SPELが期待するgetId()メソッドを追加 (修正箇所) -----
    /**
     * Thymeleaf/SPELが ${object.id} でアクセスできるようにするためのゲッター
     */
    public Integer getId() {
        return this.situationId; // 既存の ID フィールドの値を返す
    }
    // -----------------------------------------------------------------


    // ----- 既存の Getter/Setter -----
    public Integer getSituationId() {
        return situationId;
    }

    public void setSituationId(Integer situationId) {
        this.situationId = situationId;
    }

    public String getSituationName() {
        return situationName;
    }

    public void setSituationName(String situationName) {
        this.situationName = situationName;
    }
}