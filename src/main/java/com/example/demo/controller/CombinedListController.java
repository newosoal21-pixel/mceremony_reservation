package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.repository.VisitorRepository;


@Controller
@RequestMapping("/dashboard") // 例: /dashboard にアクセス
public class CombinedListController {

    private final ParkingRepository parkingRepository;
    private final VisitorRepository visitorRepository;
    private final ShuttleBusReservationRepository shuttleBusReservationRepository;

    @Autowired
    public CombinedListController(ParkingRepository parkingRepository,
    							  VisitorRepository visitorRepository,
                                  ShuttleBusReservationRepository shuttleBusReservationRepository) {
        this.parkingRepository = parkingRepository;
        this.visitorRepository = visitorRepository;
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
    }

    @GetMapping
    public String showAllLists(Model model) {
        // 1. 駐車場予約リスト
        model.addAttribute("parkings", parkingRepository.findAll());
        
        // 2. 来館者予約リスト (VisitSituation エンティティを使用)
        model.addAttribute("visits", visitorRepository.findAll()); 
        
        // 3. 送迎バス運行リスト (ShuttleBusReservation エンティティを使用)
        model.addAttribute("busReservations", shuttleBusReservationRepository.findAll()); 
        
        // テンプレート名 (例: dashboard.html)
        return "dashboard"; 
    }
}