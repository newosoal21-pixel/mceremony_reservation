package com.example.demo.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.ShuttleBusReservation;

@Repository
public interface ShuttleBusReservationRepository extends JpaRepository<ShuttleBusReservation, Integer> {

	// 💡 UPSERTのための複合キー検索メソッドを定義
    Optional<ShuttleBusReservation> findByBusNameAndVisitReservationTime(
        String busName, 
        LocalDateTime visitReservationTime
    );
	
}
