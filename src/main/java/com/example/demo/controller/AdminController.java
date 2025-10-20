package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

// jakarta.servlet.http.HttpSession のインポートは不要になります

@Controller
@RequestMapping("/admin")
public class AdminController {

    // 💡 修正: HttpSessionの引数を削除し、シンプルな形に戻す
    @GetMapping("/dashboard")
    public String adminDashboard() {
        
        // 💡 古い手動のセッションチェックロジックは全て削除されました。
        //    Spring Security (SecurityConfig) がアクセスを保証します。
        
        return "admin/addashboard"; 
    }
}