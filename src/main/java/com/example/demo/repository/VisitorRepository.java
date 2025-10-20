package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Visitor;

@Repository
public interface VisitorRepository extends JpaRepository<Visitor, Integer> {
 // JpaRepositoryが findAll() を提供しています
 Visitor findByFamilyNames(String familyNames);
}
