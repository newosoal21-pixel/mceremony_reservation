package com.example.demo.controller;


import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model; // 💡 修正: Spring MVCのModelをインポート
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.demo.model.Department;
import com.example.demo.model.Employee;
import com.example.demo.repository.DepartmentRepository;
import com.example.demo.repository.EmployeeRepository;

@Controller 
@RequestMapping("/employees")
public class EmployeeController {

    // 💡 修正: リポジトリのフィールド宣言
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;

    // 💡 修正: コンストラクタインジェクションの追加
    @Autowired
    public EmployeeController(EmployeeRepository employeeRepository, DepartmentRepository departmentRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
    }

    // 1. 一覧表示（GET /employees）
    @GetMapping
    public String listEmployees(Model model) { // Model型をorg.springframework.ui.Modelに修正
        List<Employee> employees = employeeRepository.findAll();
        model.addAttribute("employees", employees);
        return "employee/list"; // employee/list.html を返す
    }
    
    // 2. 詳細表示・編集フォーム（GET /employees/{id}）
    @GetMapping("/{id}")
    public String editEmployeeForm(@PathVariable Integer id, Model model) { // Model型をorg.springframework.ui.Modelに修正
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found for this id :: " + id));

        // 部署選択肢のために全部署を取得
        List<Department> departments = departmentRepository.findAll();

        model.addAttribute("employee", employee);
        model.addAttribute("departments", departments);
        return "employee/detail"; // employee/detail.html を返す
    }
    
    // 3. 更新処理（PUT /employees/{id}）
    @PutMapping("/{id}")
    public String updateEmployee(@PathVariable Integer id, 
                                 @ModelAttribute Employee employeeDetails, 
                                 @RequestParam(required = false) String passwordHash) { // 新しいパスワード
        
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found for this id :: " + id));

        // 必須フィールドの更新
        employee.setUserName(employeeDetails.getUserName());
        employee.setIsAdmin(employeeDetails.getIsAdmin());
        employee.setDeleteFlag(employeeDetails.getDeleteFlag());

        // 部署 (外部キー) の処理
        // 💡 注意: employeeDetails.getDepartment()がnullでないことを確認してください
        if (employeeDetails.getDepartment() != null) {
            Department department = departmentRepository.findById(employeeDetails.getDepartment().getId())
                    .orElseThrow(() -> new RuntimeException("Department not found for id :: " + employeeDetails.getDepartment().getId()));
            employee.setDepartment(department);
        }

        // パスワードハッシュの更新（入力があった場合のみ）
        if (passwordHash != null && !passwordHash.isEmpty()) {
            // 🚨 実際にはここでパスワードをハッシュ化する処理が必要です 🚨
            employee.setPasswordHash(passwordHash); 
        }

        employeeRepository.save(employee);
        
        // 更新後、一覧画面にリダイレクト
        return "redirect:/employees";
    }
}