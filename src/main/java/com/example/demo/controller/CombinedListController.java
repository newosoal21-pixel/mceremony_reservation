package com.example.demo.controller;

// 標準Javaユーティリティ
import java.util.List;

// Spring Framework
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam; 

// アプリケーション固有のモデルとリポジトリ
import com.example.demo.model.ParkingStatus;
import com.example.demo.model.VisitSituation;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;
import com.example.demo.repository.ShuttleBusReservationRepository;
import com.example.demo.repository.VisitSituationRepository;
import com.example.demo.repository.VisitorRepository;

/**
 * ダッシュボード画面（複数の予約リストを統合表示する画面）を制御するコントローラー。
 * ベースパスは /dashboard
 */
@Controller
@RequestMapping("/dashboard") 
public class CombinedListController {

    // --- 依存性の注入 (DI) 対象フィールド ---
    // 各データエンティティへのアクセス用リポジトリ
    private final ParkingRepository parkingRepository;
    private final VisitorRepository visitorRepository;
    private final ShuttleBusReservationRepository shuttleBusReservationRepository;
    private final ParkingStatusRepository parkingStatusRepository; 
    private final VisitSituationRepository visitSituationRepository; 

    /**
     * コンストラクタインジェクション。
     * 必要な全てのリポジトリをSpringコンテナから受け取る。
     */
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

    // ----------------------------------------------------------------------
    // --- エンドポイント定義 ---
    // ----------------------------------------------------------------------

    /**
     * GET /dashboard
     * ダッシュボード画面を表示するための全ての必要なデータをモデルに追加する。
     * * @param model データをビューに渡すためのSpring UI Model
     * @param successMessage URLパラメータとして渡される成功通知メッセージ (Optional)
     * @param errorMessage URLパラメータとして渡されるエラー通知メッセージ (Optional)
     * @return 遷移先のビュー名 ("dashboard.html"など)
     */
    @GetMapping
    public String showAllLists(Model model,
                               @RequestParam(value = "successMessage", required = false) String successMessage,
                               @RequestParam(value = "errorMessage", required = false) String errorMessage) {
        
        // --- 1. メインの予約リストデータの取得とモデルへの追加 ---
        
        // 1. 駐車場予約リスト (parkings テーブルの全データ)
        model.addAttribute("parkings", parkingRepository.findAll());
        
        // 2. 来館者予約リスト (visitors テーブルの全データ)
        model.addAttribute("visits", visitorRepository.findAll()); 
        
        // 3. 送迎バス運行リスト (shuttlebus_reservations テーブルの全データ)
        model.addAttribute("busReservations", shuttleBusReservationRepository.findAll()); 
        
        // --- 2. ステータスマスターデータの取得とモデルへの追加 ---
        
        // 4. 駐車場利用状況リスト (ParkingStatus マスター) を取得し、IDで昇順ソート
        List<ParkingStatus> parkingStatuses = parkingStatusRepository.findAll(
            Sort.by(Sort.Direction.ASC, "statusId")
        ); 
        model.addAttribute("parkingStatuses", parkingStatuses); 
        
        // 5. 来館状況リスト (VisitSituation マスター) を取得し、IDで昇順ソート
        List<VisitSituation> visitSituations = visitSituationRepository.findAll(
            Sort.by(Sort.Direction.ASC, "id")
        );
        model.addAttribute("visitSituations", visitSituations); 
        
        // --- 3. 通知メッセージのモデルへの追加 (リダイレクト時などに使用) ---
        
        // URLパラメータとして渡された通知メッセージをビュー側に渡す
        if (successMessage != null) {
            model.addAttribute("successMessage", successMessage);
        }
        if (errorMessage != null) {
            model.addAttribute("errorMessage", errorMessage);
        }
        
        // 遷移先のビュー名 (Thymeleafなどで使用される)
        return "dashboard";
    }
}