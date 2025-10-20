package com.example.demo.config;

import java.io.IOException;
import java.util.Collection;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class LoginSuccessHandler implements AuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, 
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        // ユーザーが持つ権限のコレクションを取得
        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        
        String redirectUrl = "/dashboard"; // 💡 デフォルトは一般ユーザーダッシュボード

        // 権限をチェックし、リダイレクト先を決定
        for (GrantedAuthority authority : authorities) {
            if (authority.getAuthority().equals("ADMIN")) {
                // 'ADMIN' 権限があれば管理者ダッシュボードへ
                redirectUrl = "/admin/dashboard"; 
                break;
            }
        }
        
        // 決定されたURLへリダイレクト
        response.sendRedirect(redirectUrl);
    }
}