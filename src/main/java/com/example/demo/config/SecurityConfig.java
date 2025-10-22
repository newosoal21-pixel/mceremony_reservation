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

    private final LoginSuccessHandler loginSuccessHandler;

    public SecurityConfig(LoginSuccessHandler loginSuccessHandler) {
        this.loginSuccessHandler = loginSuccessHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(requests -> requests
                // 公開エンドポイント
                .requestMatchers("/login", "/css/**", "/js/**").permitAll()
                
                // 🔐 管理者専用エンドポイント 1: /admin/**
                .requestMatchers("/admin/**").hasAuthority("ADMIN") 
                
                // 💡 修正: 管理者専用エンドポイント 2: /dataimport/** を 'ADMIN'権限で許可
                // AntPathRequestMatcherを使うとより確実ですが、ここでは文字列パスで設定します。
                .requestMatchers("/dataimport/**").hasAuthority("ADMIN")
                
                .requestMatchers("/employees/**").hasAuthority("ADMIN")
                
                // その他のすべてのリクエストは認証が必要
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login") 
                .successHandler(loginSuccessHandler)
                .failureUrl("/login?error")
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            );

        return http.build();
    }
}