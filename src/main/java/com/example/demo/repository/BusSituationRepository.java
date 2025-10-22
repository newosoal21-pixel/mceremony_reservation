package com.example.demo.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.BusSituation;

@Repository
public interface BusSituationRepository extends JpaRepository<BusSituation, Integer> {
 // 状況名で検索するカスタムメソッドの例
	Optional<BusSituation> findByName(String name);
}
