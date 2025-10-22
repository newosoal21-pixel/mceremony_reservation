package com.example.demo.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Visitor;

@Repository
public interface VisitorRepository extends JpaRepository<Visitor, Integer> {
 // JpaRepositoryが findAll() を提供しています
	// 💡 氏名と予約日時で既存レコードを検索するメソッド（UPSERT用）
    Optional<Visitor> findByVisitorNameAndVisitReservationTime(String visitorName, LocalDateTime reservationTime);
}
