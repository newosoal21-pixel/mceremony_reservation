package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    @Autowired
    private EmployeeRepository employeeRepository;
    
    // 💡 修正点 1: DepartmentRepositoryの追加
    @Autowired 
    private DepartmentRepository departmentRepository; 
    
    private final PasswordEncoder passwordEncoder; 

    // 💡 修正点 2: コンストラクタの引数にDepartmentRepositoryを追加
    public EmployeeController(EmployeeRepository employeeRepository, 
                              DepartmentRepository departmentRepository, 
                              PasswordEncoder passwordEncoder) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository; 
        this.passwordEncoder = passwordEncoder; 
    }

    // 1. 一覧表示（GET /employees）
    @GetMapping
    public String listEmployees(Model model) {
        List<Employee> employees = employeeRepository.findAll();
        model.addAttribute("employees", employees);
        return "employee/list";
    }
    
    // 2. 詳細表示・編集フォーム（GET /employees/{id}）
    @GetMapping("/{id}")
    public String editEmployeeForm(@PathVariable Integer id, Model model) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found for this id :: " + id));

        List<Department> departments = departmentRepository.findAll();

        model.addAttribute("employee", employee);
        model.addAttribute("departments", departments);
        return "employee/detail";
    }
    
    // 3. 更新処理（PUT /employees/{id}）
    @PutMapping("/{id}")
    public String updateEmployee(@PathVariable Integer id, 
                                 @ModelAttribute Employee employeeDetails, 
                                 @RequestParam("department.id") Integer departmentId, 
                                 @RequestParam(required = false) String passwordHash) { // passwordHashは平文の入力
        
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found for this id :: " + id));

        // 必須フィールドの更新
        employee.setUserName(employeeDetails.getUserName());
        employee.setIsAdmin(employeeDetails.getIsAdmin());
        employee.setDeleteFlag(employeeDetails.getDeleteFlag());

        // 部署 (外部キー) の処理
        if (departmentId != null && departmentId > 0) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new RuntimeException("Department not found for id :: " + departmentId));
            employee.setDepartment(department);
        } else {
            throw new RuntimeException("Department selection is required for update.");
        }

        // 💡 修正点 3: 更新時、パスワードが入力された場合のみハッシュ化して保存
        if (passwordHash != null && !passwordHash.isEmpty()) {
            String encodedPassword = passwordEncoder.encode(passwordHash);
            employee.setPasswordHash(encodedPassword); 
        }

        employeeRepository.save(employee);
        
        return "redirect:/employees";
    }
    
 
	// 4. 新規登録フォームの表示（GET /employees/new）
	@GetMapping("/new")
	public String newEmployeeForm(Model model) {
	    model.addAttribute("employee", new Employee());
	    
	    List<Department> departments = departmentRepository.findAll();
	    model.addAttribute("departments", departments);
	    
	    return "employee/new";
	}
	 
	
	// 5. 新規登録処理（POST /employees）
    @PostMapping
    public String createEmployee(@ModelAttribute Employee employee, 
                                 @RequestParam("departmentId") Integer departmentId, 
                                 @RequestParam("passwordHash") String plainPassword, 
                                 Model model) {

        // 1. パスワードのハッシュ化
        if (plainPassword != null && !plainPassword.isEmpty()) {
            String hashedPassword = passwordEncoder.encode(plainPassword);
            employee.setPasswordHash(hashedPassword); // ハッシュ値を設定
        } else {
            // パスワードが必須の場合は、ここでエラー処理を行いフォームに戻す
            // 例: model.addAttribute("employee", employee);
            //     model.addAttribute("errorMessage", "パスワードは必須です。");
            //     return "employee/new";
        }
        
        // 2. 部署の処理
        if (departmentId != null && departmentId > 0) {
            Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new RuntimeException("Department not found for id :: " + departmentId));
            employee.setDepartment(department);
        } else {
            // エラー処理
        }
        
        // 3. 保存
        employeeRepository.save(employee);
        
        return "redirect:/employees";
    }
}