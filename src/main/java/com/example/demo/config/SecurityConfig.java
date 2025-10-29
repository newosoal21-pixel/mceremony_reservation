package com.example.demo.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
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
    
    // ADMINユーザー専用のセッション制御ストラテジー
    @Bean
    public ConcurrentSessionControlAuthenticationStrategy concurrentSessionControlStrategyAdmin(SessionRegistry sessionRegistry) {
        // ADMINユーザー専用: 最大セッション数を 1 に制限
        ConcurrentSessionControlAuthenticationStrategy strategy = 
            new ConcurrentSessionControlAuthenticationStrategy(sessionRegistry);
        strategy.setMaximumSessions(1);
        strategy.setExceptionIfMaximumExceeded(true); 
        return strategy;
    }
    
    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy(SessionRegistry sessionRegistry) {
        SessionFixationProtectionStrategy fixationStrategy = new SessionFixationProtectionStrategy();
        
        // ADMIN制御ストラテジーのみを追加 (一般ユーザーは制限なし)
        List<SessionAuthenticationStrategy> strategies = Arrays.asList(
            fixationStrategy, 
            concurrentSessionControlStrategyAdmin(sessionRegistry)
        );
        return new CompositeSessionAuthenticationStrategy(strategies);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF設定
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")
            )
            
            // 権限設定
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**", "/error", "/login", "/ws/**").permitAll()
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
                // 💡 修正点: sessionAuthenticationStrategy のみ設定
                .sessionAuthenticationStrategy(sessionAuthenticationStrategy(sessionRegistry())) 
                .invalidSessionUrl("/login?expired") // 💡 修正点: expiredUrl を invalidSessionUrl に変更
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