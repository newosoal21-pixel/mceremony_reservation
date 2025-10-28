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

    public ConcurrentSessionControlAuthenticationStrategy concurrentSessionControlStrategy(SessionRegistry sessionRegistry) {
        
        return new ConcurrentSessionControlAuthenticationStrategy(sessionRegistry) {
            
            @Override
            public void onAuthentication(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
                UserDetails userDetails = (UserDetails) authentication.getPrincipal();

                boolean isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ADMIN")); 

                if (isAdmin) {
                    this.setMaximumSessions(1);
                    this.setExceptionIfMaximumExceeded(true);
                } else {
                    this.setMaximumSessions(-1);
                    this.setExceptionIfMaximumExceeded(false);
                }

                super.onAuthentication(authentication, request, response);
            }
        };
    }
    
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
            // 💡 修正: /api/ へのリクエスト（POST/PUTなど）に対してCSRF保護を無効化
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")
            )
            
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
                .sessionAuthenticationStrategy(sessionAuthenticationStrategy(sessionRegistry())) 
                .maximumSessions(-1) 
                .sessionRegistry(sessionRegistry()) 
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