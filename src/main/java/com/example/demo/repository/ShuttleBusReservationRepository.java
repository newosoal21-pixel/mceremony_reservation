package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.ShuttleBusReservation;

@Repository
public interface ShuttleBusReservationRepository extends JpaRepository<ShuttleBusReservation, Integer> {
 // スケジュールされた出発時間で検索するカスタムメソッドの例
 // List<ShuttleBusReservation> findByScheduledDepTimeBefore(LocalDateTime time);
}
