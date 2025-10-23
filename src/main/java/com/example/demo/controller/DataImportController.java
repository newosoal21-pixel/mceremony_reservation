package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.demo.model.BusSituation; // 💡 追加
import com.example.demo.model.Parking;
import com.example.demo.model.ParkingStatus;
import com.example.demo.model.ShuttleBusReservation;
import com.example.demo.model.VisitSituation;
import com.example.demo.model.Visitor;
import com.example.demo.repository.BusSituationRepository; // 💡 追加
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.repository.VisitSituationRepository;
import com.example.demo.repository.VisitorRepository;
import com.example.demo.service.CsvService;

@Controller
@RequestMapping("/dataimport")
public class DataImportController {

    // データ取得に必要なリポジトリを定義
    private final ParkingRepository parkingRepository;
    private final ParkingStatusRepository parkingStatusRepository;
    private final VisitorRepository visitRepository;
    private final VisitSituationRepository visitSituationRepository;
    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final BusSituationRepository busSituationRepository; // 💡 追加: BusSituationRepository
    
    // CsvImportService のインスタンスを注入
    private final CsvService csvService;

    @Autowired
    public DataImportController(
        ParkingRepository parkingRepository,
        ParkingStatusRepository parkingStatusRepository,
        VisitorRepository visitRepository,
        VisitSituationRepository visitSituationRepository,
        ShuttleBusReservationRepository shuttleBusReservationRepository,
        BusSituationRepository busSituationRepository, // 💡 追加: BusSituationRepositoryをコンストラクタに追加
        CsvService csvImportService) {
        
        this.parkingRepository = parkingRepository;
        this.parkingStatusRepository = parkingStatusRepository;
        this.visitRepository = visitRepository;
        this.visitSituationRepository = visitSituationRepository;
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.busSituationRepository = busSituationRepository; // 💡 初期化
        this.csvService = csvImportService;
    }

    // CSVインポートメニュー表示用のGetMapping
    @GetMapping // GET /dataimport にマッピング
    public String dataImportMenu(
    	    Model model, 
    	    @RequestParam(value = "activeTab", required = false) String activeTab,
    	    @RequestParam(value = "messageFor", required = false) String messageFor){
    	
    	System.out.println("Active Tab Parameter received: " + activeTab);
    	model.addAttribute("activeTab", activeTab);
    	
        // 1. 駐車場予約リストとステータス (ID昇順でソート)
        List<Parking> parkings = parkingRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        model.addAttribute("parkings", parkings);
        List<ParkingStatus> parkingStatuses = parkingStatusRepository.findAll(Sort.by(Sort.Direction.ASC, "statusId"));
        model.addAttribute("parkingStatuses", parkingStatuses);
        
        // 2. 来館者予約リストと状況
        List<Visitor> visits = visitRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        model.addAttribute("visits", visits);
        List<VisitSituation> visitSituations = visitSituationRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        model.addAttribute("visitSituations", visitSituations);
        
        // 3. 送迎バス運行リスト
        List<ShuttleBusReservation> busReservations = shuttleBusReservationRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        model.addAttribute("busReservations", busReservations);

        // 💡 追加: 入出庫状況マスタデータを取得し、モデルに追加
        List<BusSituation> busSituations = busSituationRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        model.addAttribute("busSituations", busSituations); 
        
        // メッセージ送信先の識別子をモデルに追加
        model.addAttribute("messageFor", messageFor);
        
        System.out.println("Active Tab Parameter received: " + activeTab);
        
        // テンプレート名
        return "admin/dataimport"; 
    }
    
    // ------------------------------------------------------------------------
    // CSVアップロード処理 (POST)
    // ------------------------------------------------------------------------

    // 駐車場予約リストの取り込み処理
    @PostMapping("/upload/parking")
    public String uploadParkingCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        // CSVアップロードフォームが tab1 にあるため、タブキープ先は tab1
        final String TAB_ID = "tab1"; 
        
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            // ファイルが空の場合も、タブを維持してリダイレクト
            return "redirect:/dataimport?activeTab=" + TAB_ID;
        }
        
        try {
            csvService.importParkingData(file); 
            
            ra.addFlashAttribute("message", "駐車場予約CSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 駐車場予約CSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        // 成功/失敗に関わらず、tab1 をアクティブにし、メッセージを parking タブ向けに指定
        return "redirect:/dataimport?activeTab=" + TAB_ID + "&messageFor=parking";
    }

    // 来館者予約リストの取り込み処理
    @PostMapping("/upload/visit")
    public String uploadVisitCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        // CSVアップロードフォームが tab2 にあるため、タブキープ先は tab2
        final String TAB_ID = "tab2";
        
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            // ファイルが空の場合も、タブを維持してリダイレクト
            return "redirect:/dataimport?activeTab=" + TAB_ID;
        }

        try {
            csvService.importVisitData(file);
            
            ra.addFlashAttribute("message", "来館者予約CSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 来館者予約CSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        // 成功/失敗に関わらず、tab2 をアクティブにし、メッセージを visit タブ向けに指定
        return "redirect:/dataimport?activeTab=" + TAB_ID + "&messageFor=visit";
    }

    // 送迎バス運行リストの取り込み処理
    @PostMapping("/upload/bus")
    public String uploadBusCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        // CSVアップロードフォームが tab3 にあるため、タブキープ先は tab3
        final String TAB_ID = "tab3";
        
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            // ファイルが空の場合も、タブを維持してリダイレクト
            return "redirect:/dataimport?activeTab=" + TAB_ID; 
        }

        try {
            csvService.importBusData(file);
            
            ra.addFlashAttribute("message", "送迎バスCSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 送迎バスCSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        
        // 成功/失敗に関わらず、tab3 をアクティブにし、メッセージを bus タブ向けに指定
        return "redirect:/dataimport?activeTab=" + TAB_ID + "&messageFor=bus"; 
    }
}