package com.example.demo.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model; // Modelは不要になることが多いが、エラーメッセージ表示のために残すことも可能
import org.springframework.web.bind.annotation.GetMapping;

// 💡 Spring Securityへ移行した場合、LoginControllerはシンプルになります

@Controller
public class LoginController {

    // 1. ログインフォーム表示
    @GetMapping("/login")
    public String showLoginForm(Model model) { // Modelはエラーパラメータ処理のために残す
        // Spring Securityは認証失敗時、/login?error を返すため、
        // テンプレート側でエラーパラメータをチェックして表示するのが一般的です。
        return "login"; // login.html を返す
    }
    
    // 💡 @PostMapping("/login") と @GetMapping("/logout") は削除されます
}