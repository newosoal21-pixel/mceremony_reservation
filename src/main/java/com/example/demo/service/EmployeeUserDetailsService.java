package com.example.demo.service;

import java.util.Collections;
import java.util.List;

// import org.springframework.cache.annotation.Cacheable; // 💡 キャッシュ関連のインポートは不要になりました
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.example.demo.model.Employee;
import com.example.demo.repository.EmployeeRepository;

@Service
public class EmployeeUserDetailsService implements UserDetailsService {

    private final EmployeeRepository employeeRepository;
    
    public EmployeeUserDetailsService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    // ユーザー名に基づいてユーザー情報をロード
    @Override
    // @Cacheable("users") 💡 2回目ログイン失敗の原因であったキャッシュアノテーションを削除
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        
        // ユーザー名の前後の空白を削除
        String trimmedUsername = username.trim(); 
        
        // ユーザー名でDB検索（トリミング後のユーザー名を使用）
        Employee employee = employeeRepository.findByUserName(trimmedUsername);
        
        if (employee == null) {
            // ユーザーが見つからない場合の例外
            throw new UsernameNotFoundException("ユーザー名: " + trimmedUsername + " が見つかりません。");
        }
        
        // 権限を設定: is_adminフラグに基づき 'ADMIN' または 'USER' の権限を付与
        List<GrantedAuthority> authorities;
        if (employee.getIsAdmin()) {
            // 管理者には 'ADMIN' 権限
            authorities = Collections.singletonList(new SimpleGrantedAuthority("ADMIN"));
        } else {
            // 一般ユーザーには 'USER' 権限
            authorities = Collections.singletonList(new SimpleGrantedAuthority("USER"));
        }
        
        // Spring Securityが利用するUserDetailsオブジェクトを生成
        return new org.springframework.security.core.userdetails.User(
            employee.getUserName(), 
            employee.getPasswordHash(), // BCryptハッシュ化されたパスワード
            authorities
        );
    }
}