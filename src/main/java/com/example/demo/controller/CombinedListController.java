package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam; // 💡 追加

import com.example.demo.model.ParkingStatus;
import com.example.demo.model.VisitSituation;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.repository.VisitSituationRepository;
import com.example.demo.repository.VisitorRepository;

@Controller
@RequestMapping("/dashboard") 
public class CombinedListController {

    private final ParkingRepository parkingRepository;
    private final VisitorRepository visitorRepository;
    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final ParkingStatusRepository parkingStatusRepository; 
    private final VisitSituationRepository visitSituationRepository; 

    @Autowired
    public CombinedListController(ParkingRepository parkingRepository,
    							  VisitorRepository visitorRepository,
                                  ShuttleBusReservationRepository shuttleBusReservationRepository,
                                  ParkingStatusRepository parkingStatusRepository,
                                  VisitSituationRepository visitSituationRepository) {
        this.parkingRepository = parkingRepository;
        this.visitorRepository = visitorRepository;
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.parkingStatusRepository = parkingStatusRepository; 
        this.visitSituationRepository = visitSituationRepository; 
    }

    @GetMapping
    public String showAllLists(Model model,
                               // 💡 追加: 通知メッセージを受け取る
                               @RequestParam(value = "successMessage", required = false) String successMessage,
                               @RequestParam(value = "errorMessage", required = false) String errorMessage) {
        
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
        
        // 5. 来館状況リスト (VisitSituation) を取得し、モデルに追加
        List<VisitSituation> visitSituations = visitSituationRepository.findAll(
            Sort.by(Sort.Direction.ASC, "id")
        );
        model.addAttribute("visitSituations", visitSituations); 
        
        // 💡 通知メッセージをモデルに追加
        // JavaScript側でURLパラメータを直接参照するため、これは主にサーバーサイドでの確認用ですが、
        // 必要に応じてThymeleaf側でメッセージを扱うために渡しておきます。
        if (successMessage != null) {
            model.addAttribute("successMessage", successMessage);
        }
        if (errorMessage != null) {
            model.addAttribute("errorMessage", errorMessage);
        }
        
        return "dashboard";
    }
}