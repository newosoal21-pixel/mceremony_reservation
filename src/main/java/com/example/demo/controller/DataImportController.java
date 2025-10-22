package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

// 💡 注意: このコントローラーでデータ処理を行う場合、
// 必要なRepository（ParkingRepository, VisitRepository, BusRepositoryなど）を
// @Autowired で注入する必要があります。

@Controller
@RequestMapping("/")
public class DataImportController {
    
    // 💡 修正点: 競合していた2つのGetMappingを統合。
    // このメソッドがCSVインポートメニュー（/dataimport）を表示する役割を担います。
    @GetMapping("/dataimport")
    public String dataImportMenu(Model model) {
        // TODO: 各タブで表示するデータをDBから取得してModelに追加します。
        // 例：
        // List<Parking> parkings = parkingRepository.findAll();
        // model.addAttribute("parkings", parkings);
        // model.addAttribute("visits", visitRepository.findAll());
        // model.addAttribute("busReservations", busRepository.findAll());
        
        // 戻り値はテンプレート名（例: "admin/dataimport" または "dataimport_menu_template"）
        return "admin/dataimport"; 
    }
    
    // 駐車場予約リストの取り込み処理
    @PostMapping("/upload/parking")
    public String uploadParkingCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            return "redirect:/dataimport";
        }
        
        try {
            // TODO: CSV処理ロジックを実装し、Parkingエンティティとしてデータベースに保存します。
            // 例: csvService.importParkingData(file);
            ra.addFlashAttribute("message", "駐車場予約CSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 駐車場予約CSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        return "redirect:/dataimport";
    }

    // 来館者予約リストの取り込み処理
    @PostMapping("/upload/visit")
    public String uploadVisitCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            return "redirect:/dataimport";
        }

        try {
            // TODO: CSV処理ロジックを実装し、Visitエンティティとしてデータベースに保存します。
            // 例: csvService.importVisitData(file);
            ra.addFlashAttribute("message", "来館者予約CSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 来館者予約CSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        return "redirect:/dataimport";
    }

    // 送迎バス運行リストの取り込み処理
    @PostMapping("/upload/bus")
    public String uploadBusCsv(@RequestParam("file") MultipartFile file, RedirectAttributes ra) {
        if (file.isEmpty()) {
            ra.addFlashAttribute("message", "ファイルが選択されていません。");
            return "redirect:/dataimport";
        }

        try {
            // TODO: CSV処理ロジックを実装し、BusReservationエンティティとしてデータベースに保存します。
            // 例: csvService.importBusData(file);
            ra.addFlashAttribute("message", "送迎バスCSVの取り込みに成功しました。");
        } catch (Exception e) {
            e.printStackTrace();
            ra.addFlashAttribute("message", "エラー: 送迎バスCSVの処理に失敗しました。詳細: " + e.getMessage());
        }
        return "redirect:/dataimport";
    }
}