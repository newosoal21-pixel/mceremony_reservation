package com.example.demo.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.VisitSituation;

@Repository
public interface VisitSituationRepository extends JpaRepository<VisitSituation, Integer> {
    // JpaRepository の継承により、CRUD操作が利用可能です
	
	// 💡 状況名でVisitSituationエンティティを検索するメソッドを追加（DBのフィールド名に合わせる）
    Optional<VisitSituation> findBySituationName(String situationName); 
    
    // または findByVisitSituationName など、エンティティの正確なフィールド名を使用
}