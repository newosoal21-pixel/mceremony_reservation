package com.example.demo;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class Testpass {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "Testpassword1!"; // 実際に使いたいパスワード
        String hashedPassword = encoder.encode(rawPassword);
        System.out.println("ハッシュ化されたパスワード: " + hashedPassword);
    }
}
