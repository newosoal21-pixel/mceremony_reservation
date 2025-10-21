package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.demo.model.Parking;
import com.example.demo.model.ParkingStatus;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;

@Controller
@RequestMapping("/parkings")
public class ParkingController {

    private final ParkingRepository parkingRepository;
    private final ParkingStatusRepository parkingStatusRepository;

    @Autowired
    public ParkingController(ParkingRepository parkingRepository, ParkingStatusRepository parkingStatusRepository) {
        this.parkingRepository = parkingRepository;
        this.parkingStatusRepository = parkingStatusRepository;
    }

    /**
     * 駐車場予約リスト一覧画面を表示するメソッド
     * URL: /parkings に GETリクエスト
     */
    @GetMapping
    public String listParkings(Model model) {
        
        // 1. 駐車場予約リストを取得し、モデルに追加
        List<Parking> parkings = parkingRepository.findAll();
        model.addAttribute("parkings", parkings);
        
     // 2. 利用状況リストの取得と追加 
        List<ParkingStatus> parkingStatuses = parkingStatusRepository.findAll(); 
        model.addAttribute("parkingStatuses", parkingStatuses); 
        
        // 2. テンプレート名 "dashboard" を返してメソッドを終了
        return "dashboard"; 
    }
}