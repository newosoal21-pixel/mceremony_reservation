package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "BUS_SITUATIONS") // データベースのテーブル名を指定
public class BusSituation {

    /**
     * bus_situations_id (INT PRIMARY KEY)
     */
    @Id // 主キーであることを示す
    @Column(name = "bus_situations_id") // データベースのカラム名を指定
    private Integer id;

    /**
     * bus_situations_name (VARCHAR(64) NOT NULL UNIQUE)
     */
    @Column(name = "bus_situations_name", nullable = false, unique = true, length = 64)
    private String name;

    // --- コンストラクタ ---

    // JPA/Hibernate が使用する引数なしのコンストラクタ（必須）
    public BusSituation() {
    }

    // すべてのフィールドを持つコンストラクタ（任意）
    public BusSituation(Integer id, String name) {
        this.id = id;
        this.name = name;
    }

    // --- ゲッターとセッター ---
    
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
