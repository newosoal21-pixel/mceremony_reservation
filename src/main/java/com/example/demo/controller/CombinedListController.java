package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.demo.model.ParkingStatus; // 💡 追加
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository; // 💡 追加
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.repository.VisitorRepository;

@Controller
@RequestMapping("/dashboard") //  /dashboard にアクセス
public class CombinedListController {

    private final ParkingRepository parkingRepository;
    private final VisitorRepository visitorRepository;
    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final ParkingStatusRepository parkingStatusRepository; // 💡 追加

    @Autowired
    public CombinedListController(ParkingRepository parkingRepository,
    							  VisitorRepository visitorRepository,
                                  ShuttleBusReservationRepository shuttleBusReservationRepository,
                                  ParkingStatusRepository parkingStatusRepository) { // 💡 追加
        this.parkingRepository = parkingRepository;
        this.visitorRepository = visitorRepository;
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.parkingStatusRepository = parkingStatusRepository; // 💡 追加
    }

    @GetMapping
    public String showAllLists(Model model) {
        // 1. 駐車場予約リスト
        model.addAttribute("parkings", parkingRepository.findAll());
        
        // 2. 来館者予約リスト (VisitSituation エンティティを使用)
        model.addAttribute("visits", visitorRepository.findAll()); 
        
        // 3. 送迎バス運行リスト (ShuttleBusReservation エンティティを使用)
        model.addAttribute("busReservations", shuttleBusReservationRepository.findAll()); 
        
        // 4. 駐車場利用状況リストをDBから取得し、モデルに追加 (💡 ここを修正)
        // statusId の昇順 (ASC) でソートする
        List<ParkingStatus> parkingStatuses = parkingStatusRepository.findAll(
            Sort.by(Sort.Direction.ASC, "statusId") // 💡 昇順ソートを適用
        ); 
        model.addAttribute("parkingStatuses", parkingStatuses); 
        
        // テンプレート名 (例: dashboard.html)
        return "dashboard";
    }
}