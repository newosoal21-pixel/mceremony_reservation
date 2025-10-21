package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.demo.model.ParkingStatus;
import com.example.demo.model.VisitSituation; // 💡 追加: VisitSituation エンティティ
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.repository.VisitSituationRepository; // 💡 追加: VisitSituationRepository
import com.example.demo.repository.VisitorRepository;

@Controller
@RequestMapping("/dashboard") 
public class CombinedListController {

    private final ParkingRepository parkingRepository;
    private final VisitorRepository visitorRepository;
    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final ParkingStatusRepository parkingStatusRepository; 
    private final VisitSituationRepository visitSituationRepository; // 💡 追加

    @Autowired
    public CombinedListController(ParkingRepository parkingRepository,
    							  VisitorRepository visitorRepository,
                                  ShuttleBusReservationRepository shuttleBusReservationRepository,
                                  ParkingStatusRepository parkingStatusRepository,
                                  VisitSituationRepository visitSituationRepository) { // 💡 追加
        this.parkingRepository = parkingRepository;
        this.visitorRepository = visitorRepository;
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.parkingStatusRepository = parkingStatusRepository; 
        this.visitSituationRepository = visitSituationRepository; // 💡 追加
    }

    @GetMapping
    public String showAllLists(Model model) {
        // 1. 駐車場予約リスト
        model.addAttribute("parkings", parkingRepository.findAll());
        
        // 2. 来館者予約リスト
        model.addAttribute("visits", visitorRepository.findAll()); 
        
        // 3. 送迎バス運行リスト
        model.addAttribute("busReservations", shuttleBusReservationRepository.findAll()); 
        
        // 4. 駐車場利用状況リスト (ParkingStatus)
        List<ParkingStatus> parkingStatuses = parkingStatusRepository.findAll(
            Sort.by(Sort.Direction.ASC, "statusId")
        ); 
        model.addAttribute("parkingStatuses", parkingStatuses); 
        
        // 5. 🔥 来館状況リスト (VisitSituation) を取得し、モデルに追加
        List<VisitSituation> visitSituations = visitSituationRepository.findAll(
            Sort.by(Sort.Direction.ASC, "id")
        );
        model.addAttribute("visitSituations", visitSituations); 
        
        return "dashboard";
    }
}