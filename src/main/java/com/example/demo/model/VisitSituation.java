package com.example.demo.model;

import jakarta.persistence.Column; // 🚨 Columnをインポート
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// テーブル名が 'visit_situations' で正しいと仮定
@Entity 
@Table(name = "visit_situations")
public class VisitSituation {

    // 🚨 修正点: situationId フィールドに @Column アノテーションを追加
    @Id
    @Column(name = "visit_situation_id") // データベースの実際のIDカラム名
    private Integer situationId; 
    
    // 🚨 修正点: situationName フィールドに @Column アノテーションを追加
    @Column(name = "visit_situations_name") // データベースの実際の名前カラム名
    private String situationName;

    // ----- Getter/Setter -----
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