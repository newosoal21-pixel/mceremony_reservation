package com.example.demo.controller;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginController {

	@GetMapping("/")
    public String home() {
        // ログイン後のメインテンプレート名 (例: index.html や home.html)
        return "dashboard"; 
    }
	
	@GetMapping("/login")
    public String loginPage(HttpServletResponse response) {
        // ログインページへのアクセス時にキャッシュ無効化ヘッダーを追加
        response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
        return "login"; 
    }
}