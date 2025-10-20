package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Employee;

// 💡 ファイル名と一致する public インターフェースは一つだけ
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {
    // user_nameで一意に検索するカスタムメソッド
    Employee findByUserName(String userName);
}
