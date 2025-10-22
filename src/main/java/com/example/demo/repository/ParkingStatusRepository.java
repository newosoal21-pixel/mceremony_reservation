package com.example.demo.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.ParkingStatus;

@Repository
public interface ParkingStatusRepository extends JpaRepository<ParkingStatus, Integer> {
 // 追加の検索メソッドは不要であれば空で問題ありません
	
	Optional<ParkingStatus> findByName(String name);
}
