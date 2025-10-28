package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // LoginSuccessHandlerを依存性注入
    private final LoginSuccessHandler loginSuccessHandler;

    public SecurityConfig(LoginSuccessHandler loginSuccessHandler) {
        this.loginSuccessHandler = loginSuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 権限設定
            .authorizeHttpRequests(auth -> auth
                // 静的リソースとエラー、ログインページは認証不要
                .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**", "/error", "/login").permitAll()
                // その他のすべてのリクエストは認証が必要
                .anyRequest().authenticated()
            )
            
            // ログイン設定
            .formLogin(form -> form
                // カスタムログインページのURL
                .loginPage("/login")
                // ログイン成功時のリダイレクトはカスタムハンドラーに委任
                .successHandler(loginSuccessHandler) 
                // ログイン失敗時のリダイレクト先
                .failureUrl("/login?error")
                .permitAll()
            )
            
            // セッション管理ポリシー (ログアウト後の再ログイン問題を解消)
            .sessionManagement(session -> session
                // ログイン成功時にセッションIDを再生成
                .sessionFixation().migrateSession() 
            )

            // ログアウト設定
            .logout(logout -> logout
                .logoutUrl("/logout") 
                .logoutSuccessUrl("/login?logout") 
                // セッションを無効化
                .invalidateHttpSession(true) 
                // 💡 【重要】認証情報をクリアすることを強制
                .clearAuthentication(true) 
                // 認証情報をクリアし、セッションCookieを削除
                .deleteCookies("JSESSIONID") 
                .permitAll()
                // ログアウト時のレスポンスにキャッシュ無効化ヘッダーを強制的に追加
                .addLogoutHandler((request, response, authentication) -> {
                    response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
                    response.setHeader("Pragma", "no-cache");
                    response.setHeader("Expires", "0");
                })
            );

        return http.build();
    }

    /**
     * パスワードのハッシュ化に使用するエンコーダー Beanの定義
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}