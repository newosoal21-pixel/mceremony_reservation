package com.example.demo.config;

import java.util.Arrays;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.ConcurrentSessionControlAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionFixationProtectionStrategy;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final LoginSuccessHandler loginSuccessHandler;

    public SecurityConfig(LoginSuccessHandler loginSuccessHandler) {
        this.loginSuccessHandler = loginSuccessHandler;
    }

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    /**
     * 💡 役割ベースの同時セッション制御を行うカスタム ConcurrentSessionControlStrategy
     */
    public ConcurrentSessionControlAuthenticationStrategy concurrentSessionControlStrategy(SessionRegistry sessionRegistry) {
        
        return new ConcurrentSessionControlAuthenticationStrategy(sessionRegistry) {
            
            @Override
            public void onAuthentication(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
                UserDetails userDetails = (UserDetails) authentication.getPrincipal();

                // 権限が "ADMIN" であるかチェック
                boolean isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ADMIN")); 

                if (isAdmin) {
                    // 管理者: 多重ログイン禁止 (最大セッション数 1)
                    this.setMaximumSessions(1);
                    this.setExceptionIfMaximumExceeded(true); // 超過時は例外をスロー (Forbidden)
                } else {
                    // 一般ユーザー: 多重ログイン許可 (最大セッション数 無制限)
                    this.setMaximumSessions(-1);
                    this.setExceptionIfMaximumExceeded(false); // 超過しても例外をスローしない
                }

                super.onAuthentication(authentication, request, response);
            }
        };
    }
    
    /**
     * 💡 セッション固定攻撃対策とカスタム同時セッション制御を組み合わせる
     */
    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy(SessionRegistry sessionRegistry) {
        SessionFixationProtectionStrategy fixationStrategy = new SessionFixationProtectionStrategy();
        
        List<SessionAuthenticationStrategy> strategies = Arrays.asList(
            fixationStrategy, 
            concurrentSessionControlStrategy(sessionRegistry)
        );
        return new CompositeSessionAuthenticationStrategy(strategies);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 権限設定
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**", "/error", "/login").permitAll()
                .anyRequest().authenticated()
            )
            
            // ログイン設定
            .formLogin(form -> form
                .loginPage("/login")
                .successHandler(loginSuccessHandler) 
                .failureUrl("/login?error")
                .permitAll()
            )
            
            // セッション管理ポリシー
            .sessionManagement(session -> session
                // 💡 カスタム SessionAuthenticationStrategy を適用
                .sessionAuthenticationStrategy(sessionAuthenticationStrategy(sessionRegistry())) 
                
                // 💡 セッション同時実行制御の有効化と SessionRegistry の登録
                .maximumSessions(-1) 
                .sessionRegistry(sessionRegistry()) 
                
                // 💡 【追加修正】セッションが超過した際の遷移先（管理者で多重ログイン時などに使用）
                // 一般ユーザーは例外を投げないため、ここでは管理者ログイン超過時にのみ動作
                .expiredUrl("/login?expired") 
            )

            // ログアウト設定
            .logout(logout -> logout
                .logoutUrl("/logout") 
                .logoutSuccessUrl("/login?logout") 
                .invalidateHttpSession(true) 
                .clearAuthentication(true) 
                .deleteCookies("JSESSIONID") 
                .permitAll()
                .addLogoutHandler((request, response, authentication) -> {
                    response.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
                    response.setHeader("Pragma", "no-cache");
                    response.setHeader("Expires", "0");
                })
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}