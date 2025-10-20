package com.example.demo.model;

import java.time.LocalDateTime;

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
@Table(name = "SHUTTLEBUS_RESERVATIONS") 
public class ShuttleBusReservation {

    /**
     * bus_id (INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT)
     */
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY) 
    @Column(name = "bus_id") 
    private Integer id;

    /**
     * visit_reservation_time (DATETIME NOT NULL)
     */
    @Column(name = "visit_reservation_time", nullable = false)
    private LocalDateTime visitReservationTime;

    /**
     * bus_name (VARCHAR(64) NOT NULL)
     */
    @Column(name = "bus_name", nullable = false, length = 64)
    private String busName;

    /**
     * bus_destination (VARCHAR(64) NOT NULL)
     */
    @Column(name = "bus_destination", nullable = false, length = 64)
    private String busDestination;

    /**
     * emptybus_dep_time (DATETIME)
     */
    @Column(name = "emptybus_dep_time")
    private LocalDateTime emptybusDepTime;

    /**
     * scheduled_dep_time (DATETIME NOT NULL)
     */
    @Column(name = "scheduled_dep_time", nullable = false)
    private LocalDateTime scheduledDepTime;

    /**
     * departure_time (DATETIME)
     */
    @Column(name = "departure_time")
    private LocalDateTime departureTime;

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
     * passengers (SMALLINT NOT NULL)
     * Javaの short 型または Integer 型にマッピング
     */
    @Column(name = "passengers", nullable = false)
    private Short passengers;

    // --- 外部キー関連マッピング ---

    /**
     * bus_situations_id (INT NOT NULL) FOREIGN KEY REFERENCES BUS_SITUATIONS
     */
    @ManyToOne(fetch = FetchType.LAZY) 
    @JoinColumn(name = "bus_situations_id", nullable = false)
    private BusSituation busSituation; // BusSituationエンティティへの関連

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
    
 // --- コンストラクタ ---

    /**
     * JPA/Hibernate が使用する引数なしのコンストラクタ（必須）
     */
    public ShuttleBusReservation() {
    }

    /**
     * 新しいエンティティを作成するためのコンストラクタ
     * ID、自動更新フィールド、NULL許容フィールド（emptybusDepTime, departureTime, remarksColumn）は除外しています。
     */
    public ShuttleBusReservation(LocalDateTime visitReservationTime, String busName, String busDestination, 
                                 LocalDateTime scheduledDepTime, String familyNames, String managerName, 
                                 Short passengers, BusSituation busSituation) {
        
        this.visitReservationTime = visitReservationTime;
        this.busName = busName;
        this.busDestination = busDestination;
        this.scheduledDepTime = scheduledDepTime;
        this.familyNames = familyNames;
        this.managerName = managerName;
        this.passengers = passengers;
        this.busSituation = busSituation;
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

    public String getBusName() {
        return busName;
    }

    public void setBusName(String busName) {
        this.busName = busName;
    }

    public String getBusDestination() {
        return busDestination;
    }

    public void setBusDestination(String busDestination) {
        this.busDestination = busDestination;
    }

    public LocalDateTime getEmptybusDepTime() {
        return emptybusDepTime;
    }

    public void setEmptybusDepTime(LocalDateTime emptybusDepTime) {
        this.emptybusDepTime = emptybusDepTime;
    }

    public LocalDateTime getScheduledDepTime() {
        return scheduledDepTime;
    }

    public void setScheduledDepTime(LocalDateTime scheduledDepTime) {
        this.scheduledDepTime = scheduledDepTime;
    }

    public LocalDateTime getDepartureTime() {
        return departureTime;
    }

    public void setDepartureTime(LocalDateTime departureTime) {
        this.departureTime = departureTime;
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

    public Short getPassengers() {
        return passengers;
    }

    public void setPassengers(Short passengers) {
        this.passengers = passengers;
    }

    public LocalDateTime getUpdateTime() {
        return updateTime;
    }

    // updateTimeはDBで自動更新されるため、setterは定義しないか、あっても外部からは使用しない
    // public void setUpdateTime(LocalDateTime updateTime) {
//         this.updateTime = updateTime;
    // }

    public String getRemarksColumn() {
        return remarksColumn;
    }

    public void setRemarksColumn(String remarksColumn) {
        this.remarksColumn = remarksColumn;
    }

    // --- 外部キー関連のアクセサ ---

    public BusSituation getBusSituation() {
        return busSituation;
    }

    public void setBusSituation(BusSituation busSituation) {
        this.busSituation = busSituation;
    }
}
