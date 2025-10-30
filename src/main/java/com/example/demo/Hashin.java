package com.example.demo;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class Hashin {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        
        // 🚨 従業員ごとに平文のパスワードをここに入力します 🚨
        String plainPassword1 = "Adminad1!"; 
        String plainPassword2 = "Ppapppap1!"; 
        
        String hashedPassword1 = encoder.encode(plainPassword1);
        String hashedPassword2 = encoder.encode(plainPassword2);
        
        System.out.println("平文: " + plainPassword1 + " -> ハッシュ: " + hashedPassword1);
        System.out.println("平文: " + plainPassword2 + " -> ハッシュ: " + hashedPassword2);
        
        // 💡 実行後、コンソールに表示されたハッシュ値（例: $2a$10$..................）をコピーします。
    }
}
