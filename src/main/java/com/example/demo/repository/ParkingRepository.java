package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Parking;

@Repository
public interface ParkingRepository extends JpaRepository<Parking, Integer> {
 // JpaRepositoryが findAll() を提供しています
 Parking findByCarNumber(String carNumber);
}