package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.VisitSituation;

@Repository
public interface VisitSituationRepository extends JpaRepository<VisitSituation, Integer> {
    // JpaRepository の継承により、CRUD操作が利用可能です
}