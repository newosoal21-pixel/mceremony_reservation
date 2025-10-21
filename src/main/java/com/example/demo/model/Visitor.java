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
@Table(name = "VISITORS") 
public class Visitor {

    /**
     * visitor_id (INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT)
     */
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY) 
    @Column(name = "visitor_id") 
    private Integer id;

    /**
     * visit_reservation_time (DATETIME NOT NULL)
     * Java 8以降の標準である LocalDateTime を使用
     */
    @Column(name = "visit_reservation_time", nullable = false)
    private LocalDateTime visitReservationTime;

    /**
     * errands_relationship (VARCHAR(64) NOT NULL)
     */
    @Column(name = "errands_relationship", nullable = false, length = 64)
    private String errandsRelationship;

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
     * compilation_cmp_time (DATETIME)
     * NULLを許容するため nullable = true (デフォルト)
     */
    @Column(name = "compilation_cmp_time")
    private LocalDateTime compilationCmpTime;
    
    // --- 外部キー関連マッピング ---

    /**
     * visit_situation_id (INT NOT NULL) FOREIGN KEY REFERENCES VISIT_SITUATIONS
     */
    @ManyToOne(fetch = FetchType.EAGER) 
    @JoinColumn(name = "visit_situation_id", nullable = false)
    private VisitSituation visitSituation; // VisitSituationエンティティへの関連

    /**
     * update_time (DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
     * データベース側で自動更新されるため、Java側では読み取り専用として扱うことが多い
     */
    @Column(name = "update_time", nullable = false, updatable = false, insertable = false)
    // 💡 注意: データベースの自動更新機能に依存する場合、この設定（insertable=false, updatable=false）が適切です。
    //         もしHibernateで制御したい場合は、@PreUpdateや@PrePersistを使用します。
    private LocalDateTime updateTime;

    /**
     * remarks_column (VARCHAR(255))
     * NULLを許容するため nullable = true (デフォルト)
     */
    @Column(name = "remarks_column", length = 255)
    private String remarksColumn;

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

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
	
	
	public LocalDateTime getCompilationCmpTime() {
		return compilationCmpTime;
	}

	public void setCompilationCmpTime(LocalDateTime compilationCmpTime) {
		this.compilationCmpTime = compilationCmpTime;
	}

	public VisitSituation getVisitSituation() {
		return visitSituation;
	}

	public void setVisitSituation(VisitSituation visitSituation) {
		this.visitSituation = visitSituation;
	}

	public LocalDateTime getUpdateTime() {
		return updateTime;
	}

	public void setUpdateTime(LocalDateTime updateTime) {
		this.updateTime = updateTime;
	}

	public String getRemarksColumn() {
		return remarksColumn;
	}

	public void setRemarksColumn(String remarksColumn) {
		this.remarksColumn = remarksColumn;
	}
    
    
}
