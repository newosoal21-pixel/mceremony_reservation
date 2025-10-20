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

    // 💡 認証成功時の遷移先を分岐させるカスタムハンドラーをインジェクション
    private final LoginSuccessHandler loginSuccessHandler;

    // コンストラクタインジェクション
    public SecurityConfig(LoginSuccessHandler loginSuccessHandler) {
        this.loginSuccessHandler = loginSuccessHandler;
    }

    // 1. パスワードエンコーダーの定義
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 2. HTTPセキュリティ設定
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(requests -> requests
                // 公開エンドポイント (ログインページ、CSSなど)
                .requestMatchers("/login", "/css/**", "/js/**").permitAll()
                
                // 🔐 管理者専用エンドポイント: 'ADMIN'権限を持つユーザーのみ許可
                .requestMatchers("/admin/**").hasAuthority("ADMIN") 
                
                // その他のすべてのリクエストは認証が必要 (ログイン済みであること)
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                // ログインフォームのURLを指定
                .loginPage("/login")
                // ログイン処理を行うURL (Spring Securityが処理)
                .loginProcessingUrl("/login") 
                
                // 💡 認証成功時にカスタムハンドラーを使用
                .successHandler(loginSuccessHandler)
                
                // 認証失敗時の遷移先
                .failureUrl("/login?error")
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout") // ログアウト成功時の遷移先
                .permitAll()
            );

        // 開発環境でH2コンソールなどを有効にする場合は、CSRFとFrameOptionsの設定が必要です
        // http.csrf(csrf -> csrf.ignoringRequestMatchers("/h2-console/**"));
        // http.headers(headers -> headers.frameOptions().sameOrigin());

        return http.build();
    }
}