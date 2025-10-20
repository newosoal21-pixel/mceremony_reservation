package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "DEPARTMENTS") // データベースのテーブル名を指定
public class Department {

    /**
     * department_id (INT PRIMARY KEY AUTO_INCREMENT)
     */
    @Id // 主キーであることを示す
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 💡 AUTO_INCREMENTに対応
    @Column(name = "department_id") // データベースのカラム名を指定
    private Integer id;

    /**
     * department_name (VARCHAR(64) NOT NULL UNIQUE)
     */
    @Column(name = "department_name", nullable = false, unique = true, length = 64)
    private String name;

    // --- コンストラクタ ---

    // JPA/Hibernate が使用する引数なしのコンストラクタ（必須）
    public Department() {
    }

    // すべてのフィールドを持つコンストラクタ（任意だが便利）
    public Department(String name) {
        // IDはAUTO_INCREMENTなのでコンストラクタには含めないことが多い
        this.name = name;
    }

    // --- ゲッターとセッター ---
    
    public Integer getId() {
        return id;
    }

    // AUTO_INCREMENTの場合、通常はIDのsetterは定義しないか、外部からは使用しない
    // public void setId(Integer id) {
    //     this.id = id;
    // }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}