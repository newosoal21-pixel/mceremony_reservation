package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.BusSituation;
import com.example.demo.model.Department;

//1. VISIT_SITUATIONS


//2. DEPARTMENTS
@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
 // 特定のnameで検索するカスタムメソッドの例
 Department findByName(String name);
}


//4. PARKING_STATUSES


//5. BUS_SITUATIONS
@Repository
public interface BusSituationRepository extends JpaRepository<BusSituation, Integer> {
 // 状況名で検索するカスタムメソッドの例
 BusSituation findByName(String name);
}




//8. SHUTTLEBUS_RESERVATIONS

