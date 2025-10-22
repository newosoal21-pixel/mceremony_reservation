package com.example.demo.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "PARKINGS") 
public class Parking {

    /**
     * parking_id (INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT)
     */
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY) 
    @Column(name = "parking_id") 
    private Integer id;

    /**
     * visit_reservation_time (DATETIME)
     */
    @Column(name = "visit_reservation_time")
    private LocalDateTime visitReservationTime;

    /**
     * errands_relationship (VARCHAR(64) NOT NULL)
     */
    @Column(name = "errands_relationship", nullable = false, length = 64)
    private String errandsRelationship;

    /**
     * car_number (VARCHAR(64) NOT NULL)
     */
    @Column(name = "car_number", nullable = false, length = 64)
    private String carNumber;
    
    /**
     * visitor_name (VARCHAR(64) NOT NULL)
     */
    @Column(name = "visitor_name", nullable = false, length = 64)
    private String visitorName;

    /**
     * family_names (VARCHAR(64) NOT NULL)
     */
    @Column(name = "family_names", nullable = false, length = 64)
    private String familyNames;

    /**
     * manager_name (VARCHAR(64) NOT NULL)
     */
    @Column(name = "manager_name", nullable = false, length = 64)
    private String managerName; 

    /**
     * departure_time (DATETIME)
     */
    @Column(name = "departure_time")
    private LocalDateTime departureTime;

    /**
     * parking_permit (VARCHAR(16) NOT NULL)
     */
    @Column(name = "parking_permit", nullable = false, length = 16)
    private String parkingPermit; 

    /**
     * parking_position (VARCHAR(16) NOT NULL)
     */
    @Column(name = "parking_position", nullable = false, length = 16)
    private String parkingPosition; 

    /**
     * update_time (DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
     * データベースの自動更新機能に委ねる
     */
    @Column(name = "update_time", nullable = false, updatable = false, insertable = false)
    private LocalDateTime updateTime;

    /**
     * remarks_column (VARCHAR(255))
     */
    @Column(name = "remarks_column", length = 255)
    private String remarksColumn;
    
    // --- 外部キー関連マッピング ---

    /**
     * parking_status_id (INT NOT NULL) FOREIGN KEY REFERENCES PARKING_STATUSES
     * (このParkingStatusエンティティは、前回作成したものです)
     */
    @ManyToOne
    // DBのカラム名が status_id の場合（Parkingテーブル内の外部キー）
    @JoinColumn(name = "parking_status_id") // Parkingテーブル内の外部キーカラム名
    private ParkingStatus parkingStatus; // Javaのプロパティ名

 // --- コンストラクタ ---

    /**
     * JPA/Hibernate が使用する引数なしのコンストラクタ（必須）
     */
    public Parking() {
    }

    /**
     * 新しいエンティティを作成するためのコンストラクタ（全必須フィールドと外部キーを含む）
     * ID、自動更新フィールド、NULL許容フィールド（visitReservationTime, departureTime, remarksColumn）は除外しています。
     */
    public Parking(String errandsRelationship, String carNumber, String visitorName,String familyNames, 
                   String managerName, String parkingPermit, String parkingPosition, 
                   Visitor visitor, ParkingStatus parkingStatus) {
        
        this.errandsRelationship = errandsRelationship;
        this.carNumber = carNumber;
        this.visitorName = visitorName;
        this.familyNames = familyNames;
        this.managerName = managerName;
        this.parkingPermit = parkingPermit;
        this.parkingPosition = parkingPosition;
        this.parkingStatus = parkingStatus;
    }


    // --- ゲッターとセッター ---

    public Integer getId() {
        return id;
    }

    // 主キーIDは通常、setterを持ちません（AUTO_INCREMENTのため）
    // public void setId(Integer id) {
//         this.id = id;
    // }

    public LocalDateTime getVisitReservationTime() {
        return visitReservationTime;
    }

    public void setVisitReservationTime(LocalDateTime visitReservationTime) {
        this.visitReservationTime = visitReservationTime;
    }

    public String getErrandsRelationship() {
        return errandsRelationship;
    }

    public void setErrandsRelationship(String errandsRelationship) {
        this.errandsRelationship = errandsRelationship;
    }

    public String getCarNumber() {
        return carNumber;
    }

    public void setCarNumber(String carNumber) {
        this.carNumber = carNumber;
    }

    public String getVisitorName() {
        return visitorName;
    }

    public void setVisitorName(String visitorName) {
        this.visitorName = visitorName;
    }
    
    public String getFamilyNames() {
        return familyNames;
    }

    public void setFamilyNames(String familyNames) {
        this.familyNames = familyNames;
    }

    public String getManagerName() {
        return managerName;
    }

    public void setManagerName(String managerName) {
        this.managerName = managerName;
    }

    public LocalDateTime getDepartureTime() {
        return departureTime;
    }

    public void setDepartureTime(LocalDateTime departureTime) {
        this.departureTime = departureTime;
    }

    public String getParkingPermit() {
        return parkingPermit;
    }

    public void setParkingPermit(String parkingPermit) {
        this.parkingPermit = parkingPermit;
    }

    public String getParkingPosition() {
        return parkingPosition;
    }

    public void setParkingPosition(String parkingPosition) {
        this.parkingPosition = parkingPosition;
    }

    public LocalDateTime getUpdateTime() {
        return updateTime;
    }

    // 💡 setUpdateTime メソッドを有効化
    public void setUpdateTime(LocalDateTime updateTime) {
        this.updateTime = updateTime;
    }

    public String getRemarksColumn() {
        return remarksColumn;
    }

    public void setRemarksColumn(String remarksColumn) {
        this.remarksColumn = remarksColumn;
    }

    // --- 外部キー関連のアクセサ ---

    public ParkingStatus getParkingStatus() {
        return parkingStatus;
    }

    public void setParkingStatus(ParkingStatus parkingStatus) {
        this.parkingStatus = parkingStatus;
    }
}