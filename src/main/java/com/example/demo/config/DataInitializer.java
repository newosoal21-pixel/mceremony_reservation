package com.example.demo.config;

import java.util.Optional;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.DependsOn;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.demo.model.Department;
// 💡 適切なパッケージパスに変更してください
import com.example.demo.model.Employee;
import com.example.demo.repository.DepartmentRepository;
import com.example.demo.repository.EmployeeRepository;

@DependsOn("securityConfig")
@Component
public class DataInitializer implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final DepartmentRepository departmentRepository;

    // コンストラクタインジェクション
    public DataInitializer(EmployeeRepository employeeRepository, 
                           PasswordEncoder passwordEncoder,
                           DepartmentRepository departmentRepository) {
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.departmentRepository = departmentRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        
        // --- 管理者アカウントの設定 ---
        final String ADMIN_USERNAME = "admin";
        // 🚨 ログインに使用したい平文のパスワードに置き換えてください 🚨
        final String RAW_PASSWORD = "Cellemonad1!"; 
        // -----------------------------

        // 💡 存在チェック: 従業員リポジトリから 'admin' ユーザーを取得
        Employee adminEmployee = employeeRepository.findByUserName(ADMIN_USERNAME);
        
        // 外部キーとして設定する Department を用意
        Department defaultDepartment = null;
        Optional<Department> defaultDeptOpt = departmentRepository.findById(1); // ID 1の部署を取得を試みる
        
        if (adminEmployee == null) {
            
            // --- 新規作成ロジック ---
            
            if (defaultDeptOpt.isEmpty()) {
                System.err.println("--- ❌ 管理者初期化失敗: 外部キーとなる部署 (ID:1) がDBに見つかりません。 ---");
                System.err.println("--- 初期化前に DEPARTMENTS テーブルにレコードを作成してください。 ---");
                return; // 処理を中断
            }
            defaultDepartment = defaultDeptOpt.get();
            
            adminEmployee = new Employee();
            adminEmployee.setUserName(ADMIN_USERNAME);
            adminEmployee.setIsAdmin(true); 
            adminEmployee.setDepartment(defaultDepartment); 

            System.out.println("--- 🔑 管理者従業員 (" + ADMIN_USERNAME + ") を新規作成し、パスワードを設定します ---");
            
        } else {
            // --- 既存ユーザーのパスワードを上書きするロジック ---
            // 既存のレコードを使用し、パスワードだけを更新します。
            System.out.println("--- ⚠️ 既存の管理者従業員 (" + ADMIN_USERNAME + ") のパスワードをBCryptで上書きします ---");
            // 既存ユーザーのDepartmentがNULLでないか確認し、NULLの場合は設定する（念のため）
            if (adminEmployee.getDepartment() == null && defaultDeptOpt.isPresent()) {
                 adminEmployee.setDepartment(defaultDeptOpt.get());
            }
        }
        
        // 🚨 新規・既存にかかわらず、必ずパスワードをBCryptでハッシュ化し、上書きする
        String encodedPassword = passwordEncoder.encode(RAW_PASSWORD); 
        adminEmployee.setPasswordHash(encodedPassword);
        
        employeeRepository.save(adminEmployee);
        
        System.out.println("--- ✅ 管理者ログイン問題解決: パスワードをBCryptハッシュで更新しました。 ---");
    }
}