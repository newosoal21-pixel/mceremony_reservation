package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "EMPLOYEES") 
public class Employee {

    /**
     * employee_id (INT PRIMARY KEY AUTO_INCREMENT)
     */
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY) 
    @Column(name = "employee_id") 
    private Integer id;

    /**
     * password_hash (VARCHAR(255) NOT NULL)
     */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    /**
     * user_name (VARCHAR(64) NOT NULL UNIQUE)
     */
    @Column(name = "user_name", nullable = false, unique = true, length = 64)
    private String userName;

    /**
     * is_admin (BOOLEAN NOT NULL DEFAULT FALSE)
     */
    @Column(name = "is_admin", nullable = false)
    private Boolean isAdmin = false; // デフォルト値をJava側でも設定

    /**
     * delete_flag (BOOLEAN NOT NULL DEFAULT FALSE)
     */
    @Column(name = "delete_flag", nullable = false)
    private Boolean deleteFlag = false; // デフォルト値をJava側でも設定

    // --- 外部キー関連マッピング ---

    /**
     * department_id (INT NOT NULL) FOREIGN KEY REFERENCES DEPARTMENTS
     */
    @ManyToOne(fetch = FetchType.LAZY) 
    @JoinColumn(name = "department_id", nullable = false)
    private Department department; // Departmentエンティティへの関連

 // --- ゲッターとセッター ---

    public Integer getId() {
        return id;
    }

    // 主キーIDは通常、setterを持ちません（AUTO_INCREMENTのため）
    // public void setId(Integer id) {
//         this.id = id;
    // }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public Boolean getIsAdmin() {
        return isAdmin;
    }

    public void setIsAdmin(Boolean isAdmin) {
        this.isAdmin = isAdmin;
    }

    public Boolean getDeleteFlag() {
        return deleteFlag;
    }

    public void setDeleteFlag(Boolean deleteFlag) {
        this.deleteFlag = deleteFlag;
    }

    public Department getDepartment() {
        return department;
    }

    // 外部キーである Department を設定するためのセッター
    public void setDepartment(Department department) {
        this.department = department;
    }
}
