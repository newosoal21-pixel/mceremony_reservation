package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "PARKING_STATUSES") // データベースのテーブル名を指定
public class ParkingStatus {

    /**
     * parking_status_id (INT PRIMARY KEY)
     */
    @Id // 主キーであることを示す
    @Column(name = "parking_status_id") // データベースのカラム名を指定
    private Integer statusId;

    /**
     * parking_status_name (VARCHAR(64) NOT NULL UNIQUE)
     */
    @Column(name = "parking_status_name", nullable = false, unique = true, length = 64)
    private String name;

    // --- コンストラクタ ---

    // JPA/Hibernate が使用する引数なしのコンストラクタ（必須）
    public ParkingStatus() {
    }

    // すべてのフィールドを持つコンストラクタ（任意）
    public ParkingStatus(Integer id, String name) {
        this.statusId = id;
        this.name = name;
    }

    // --- ゲッターとセッター ---
    
    public Integer getStatusId() { 
        return statusId;
    }

    public void setStatusId(Integer id) {
        this.statusId = id;
    }

    public String getStatusName() { // ⬅️ getName() から変更
        return name; // 内部フィールド名は name のままでOK
    }

    public void setStatusName(String name) { // ⬅️ setName() から変更
        this.name = name;
    }
}
