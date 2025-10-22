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

import com.example.demo.model.Parking;
import com.example.demo.model.ParkingStatus;
import com.example.demo.model.ShuttleBusReservation;
import com.example.demo.model.VisitSituation;
import com.example.demo.model.Visitor;
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
    
    // 💡 CsvImportService のインスタンスを注入
    private final CsvService csvService;

    @Autowired
    public DataImportController(
        ParkingRepository parkingRepository,
        ParkingStatusRepository parkingStatusRepository,
        VisitorRepository visitRepository,
        VisitSituationRepository visitSituationRepository,
        ShuttleBusReservationRepository shuttleBusReservationRepository,
        CsvService csvImportService) { // 💡 コンストラクタにサービスを追加
        
        this.parkingRepository = parkingRepository;
        this.parkingStatusRepository = parkingStatusRepository;
        this.visitRepository = visitRepository;
        this.visitSituationRepository = visitSituationRepository;
        this.shuttleBusReservationRepository = shuttleBusReservationRepository;
        this.csvService = csvImportService; // 💡 初期化
    }

    // CSVインポートメニュー表示用のGetMapping
    @GetMapping // GET /dataimport にマッピング
    public String dataImportMenu(
    	    Model model, 
    	    // ❌ 修正: パラメータ名が 'activeTab' で、必須ではない(required=false)かを確認
    	    @RequestParam(value = "activeTab", required = false) String activeTab,
    	    // 💡 追加: メッセージの送信先を識別するパラメータを受け取る
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
        // 💡 追加: メッセージ送信先の識別子をモデルに追加
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
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            return "redirect:/dataimport?activeTab=bus";
        }
        
        try {
            // 🚨 修正適用: サービス層のメソッド呼び出しを有効化 🚨
            csvService.importParkingData(file); 
            
            ra.addFlashAttribute("message", "駐車場予約CSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 駐車場予約CSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        return "redirect:/dataimport?activeTab=parking&messageFor=parking";
    }

    // 来館者予約リストの取り込み処理
    @PostMapping("/upload/visit")
    public String uploadVisitCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            return "redirect:/dataimport";
        }

        try {
            // 🚨 修正適用: サービス層のメソッド呼び出しを有効化 🚨
            csvService.importVisitData(file);
            
            ra.addFlashAttribute("message", "来館者予約CSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 来館者予約CSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        return "redirect:/dataimport?activeTab=visit&messageFor=visit";
    }

    // 送迎バス運行リストの取り込み処理
    @PostMapping("/upload/bus")
    public String uploadBusCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            // 💡 修正: タブキープに加えて、メッセージの送信先を 'bus' に指定
            return "redirect:/dataimport?activeTab=bus&messageFor=bus"; 
        }

        try {
            csvService.importBusData(file);
            
            ra.addFlashAttribute("message", "送迎バスCSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 送迎バスCSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        
        // 💡 修正: 成功・失敗に関わらず、タブキープとメッセージ送信先を指定
        return "redirect:/dataimport?activeTab=bus&messageFor=bus"; 
    }
}