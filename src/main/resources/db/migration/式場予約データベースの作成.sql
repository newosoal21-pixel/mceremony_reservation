-- データベースの作成
CREATE DATABASE `ceremonyhall_reservation` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- データベースの使用
USE `ceremonyhall_reservation`;

-- DDL (テーブル定義 修正版)

-- DEPARTMENTS (部門) テーブル
CREATE TABLE `departments` (
    `department_id` INT PRIMARY KEY AUTO_INCREMENT,
    `department_name` VARCHAR(64) NOT NULL UNIQUE
); 

-- EMPLOYEES (従業員) テーブル
CREATE TABLE `employees` (
    `employee_id` INT PRIMARY KEY AUTO_INCREMENT,
    `password_hash` VARCHAR(255) NOT NULL, -- 修正: パスワードはハッシュ化前提
    `user_name` VARCHAR(64) NOT NULL UNIQUE,
    `is_admin` BOOLEAN NOT NULL DEFAULT FALSE,
    `delete_flag` BOOLEAN NOT NULL DEFAULT FALSE,
    `department_id` INT NOT NULL,
    FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`)
);

-- parking_status (駐車状況) テーブル
CREATE TABLE `parking_statuses` (
    `parking_status_id` INT PRIMARY KEY,
    `parking_status_name` VARCHAR(64) NOT NULL UNIQUE
);

-- visit_situations (来館状況) テーブル
CREATE TABLE `visit_situations` (
    `visit_situation_id` INT PRIMARY KEY,
    `visit_situations_name` VARCHAR(64) NOT NULL UNIQUE
);

-- bus_situations (バス状況) テーブル
CREATE TABLE `bus_situations` (
    `bus_situations_id` INT PRIMARY KEY,
    `bus_situations_name` VARCHAR(64) NOT NULL UNIQUE
);


-- DML (データ挿入部分)
-- departments
INSERT INTO `departments` (`department_id`, `department_name`) VALUES (1, 'MZサービス');
INSERT INTO `departments` (`department_id`, `department_name`) VALUES (2, 'MZコーディネーター');
INSERT INTO `departments` (`department_id`, `department_name`) VALUES (3, '施設管理');

-- employees (カラム名を`employee_id`に修正)
INSERT INTO `employees` (`employee_id`, `password_hash`, `user_name`, `is_admin`, `delete_flag`,`department_id`) VALUES (1001, '$2a$10$rbg74Xku2KEXyhity077ye24VoaIlmAdCxvCuBLN8m.LzoS4Ur0/.', '管理者', TRUE, FALSE, 1);
INSERT INTO `employees` (`employee_id`, `password_hash`, `user_name`, `is_admin`, `delete_flag`,`department_id`) VALUES (1002, '$2a$10$TfTUD5Z84hPguJitjKGsyedKHtK5zujFMAomsZEqwkfMeLayEvEzS', 'ユーザー', FALSE, FALSE, 2);

-- parking_statuses
INSERT INTO `parking_statuses` (`parking_status_id`, `parking_status_name`) VALUES (1, '予約中');
INSERT INTO `parking_statuses` (`parking_status_id`, `parking_status_name`) VALUES (2, '入庫済');
INSERT INTO `parking_statuses` (`parking_status_id`, `parking_status_name`) VALUES (3, '出庫済');
INSERT INTO `parking_statuses` (`parking_status_id`, `parking_status_name`) VALUES (4, '宿泊');
INSERT INTO `parking_statuses` (`parking_status_id`, `parking_status_name`) VALUES (5, '一時出庫中');
INSERT INTO `parking_statuses` (`parking_status_id`, `parking_status_name`) VALUES (6, 'キャンセル');

-- visit_situations
INSERT INTO `visit_situations` (`visit_situation_id`, `visit_situations_name`) VALUES (1, '来館前');
INSERT INTO `visit_situations` (`visit_situation_id`, `visit_situations_name`) VALUES (2, '案内済');
INSERT INTO `visit_situations` (`visit_situation_id`, `visit_situations_name`) VALUES (3, '退館済');
INSERT INTO `visit_situations` (`visit_situation_id`, `visit_situations_name`) VALUES (4, 'キャンセル');

-- bus_situations
INSERT INTO `bus_situations` (`bus_situations_id`, `bus_situations_name`) VALUES (1, '到着前');
INSERT INTO `bus_situations` (`bus_situations_id`, `bus_situations_name`) VALUES (2, '到着済');
INSERT INTO `bus_situations` (`bus_situations_id`, `bus_situations_name`) VALUES (3, '下車出発済');
INSERT INTO `bus_situations` (`bus_situations_id`, `bus_situations_name`) VALUES (4, '乗車待機中');
INSERT INTO `bus_situations` (`bus_situations_id`, `bus_situations_name`) VALUES (5, '乗車出発済');
INSERT INTO `bus_situations` (`bus_situations_id`, `bus_situations_name`) VALUES (6, '運休');


-- visitors (訪問者/式家) テーブル
CREATE TABLE `visitors` (
    `visitor_id` INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `visit_reservation_time` DATETIME NOT NULL,
    `errands_relationship` VARCHAR(64) NOT NULL,
    `visitor_name` VARCHAR(64) NOT NULL,
    `family_names` VARCHAR(64) NOT NULL,
    `manager_name` VARCHAR(64) NOT NULL, 
    `compilation_cmp_time` DATETIME,
    `visit_situation_id` INT NOT NULL,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `remarks_column` VARCHAR(255),
    FOREIGN KEY (`visit_situation_id`) REFERENCES `visit_situations` (`visit_situation_id`)
);

-- parkings (駐車場予約) テーブル
CREATE TABLE `parkings` (
    `parking_id` INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `visit_reservation_time` DATETIME,
    `errands_relationship` VARCHAR(64) NOT NULL,
    `car_number` VARCHAR(64) NOT NULL,
    `visitor_name` VARCHAR(64) NOT NULL,
    `family_names` VARCHAR(64) NOT NULL,
    `manager_name` VARCHAR(64) NOT NULL, 
    `departure_time` DATETIME,
    `parking_permit` VARCHAR(16) NOT NULL, -- 修正: INTからBOOLEANへ (許可証の有無と想定)
    `parking_position` VARCHAR(16) NOT NULL, -- 修正: INTからVARCHARへ
    `parking_status_id` INT NOT NULL,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `remarks_column` VARCHAR(255),
    FOREIGN KEY (`parking_status_id`) REFERENCES `parking_statuses` (`parking_status_id`)
);

-- shuttlebus_reservations (シャトルバス予約) テーブル
CREATE TABLE `shuttlebus_reservations` (
    `bus_id` INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `visit_reservation_time` DATETIME NOT NULL,
    `bus_name` VARCHAR(64) NOT NULL,
    `bus_destination` VARCHAR(64) NOT NULL,
    `emptybus_dep_time` DATETIME,
    `scheduled_dep_time` DATETIME NOT NULL,
    `departure_time` DATETIME,
    `family_names` VARCHAR(64) NOT NULL,
    `manager_name` VARCHAR(64) NOT NULL,
    `passengers` SMALLINT NOT NULL,
    `bus_situations_id` INT NOT NULL,
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `remarks_column` VARCHAR(255),
    FOREIGN KEY (`bus_situations_id`) REFERENCES `bus_situations` (`bus_situations_id`)
);


-- DML (データ挿入部分)
-- visitors (`family_names`と`manager_id`を追加、`visiter_id`に修正、NULLを使用)
INSERT INTO `visitors` (`visitor_id`, `visit_reservation_time`, `errands_relationship`, `visitor_name`, `family_names`, `manager_name`, `compilation_cmp_time`, `visit_situation_id`, `update_time`, `remarks_column`)
VALUES (1, '2025-10-07 09:30:00', 'ヘアセット予約', '髪綺麗子', '白石家', '緒方', '2025-10-07 09:40:00', 2, '2025-10-07 09:45:00', '事前連絡が入ります');
INSERT INTO `visitors` (`visitor_id`, `visit_reservation_time`, `errands_relationship`, `visitor_name`, `family_names`, `manager_name`, `compilation_cmp_time`, `visit_situation_id`, `update_time`, `remarks_column`)
VALUES (2, '2025-10-07 10:00:00', '着付け予約', '呉服洋子', '森家', '白木', NULL, 1, '2025-10-07 10:00:00', '事前連絡が入ります');

-- parkings (カラムリストと値の数を修正、不要なカンマを削除、`visiter_id`をINTに修正)
INSERT INTO `parkings` (`parking_id`, `visit_reservation_time`, `errands_relationship`, `car_number`, `visitor_name`, `family_names`, `manager_name`, `departure_time`, `parking_permit`, `parking_position`, `parking_status_id`, `update_time`, `remarks_column`)
VALUES (1, '2025-10-07 10:00:00', '参列（親族）', 'わ 5070', '髪綺麗子', '森・白石', '緒方', NULL, 1, 1, 2, '2025-10-01 09:30:00', '9:20に到着予定連絡あり');

-- shuttlebus_reservations (`passengers`を数値に修正、`manager_id`を既存の値に修正)
INSERT INTO `shuttlebus_reservations` (`bus_id`, `visit_reservation_time`, `bus_name`, `bus_destination`, `emptybus_dep_time`, `scheduled_dep_time`, `departure_time`, `family_names`, `manager_name`, `passengers`, `bus_situations_id`, `update_time`, `remarks_column`)
VALUES (1, '2025-10-07 09:30:00', 'たんぽぽ','博多・天神駅', '2025-10-07 09:45:00', '2025-10-07 14:30:00', '2025-10-07 14:45:00' , '森・白石', '緒方', 15, 2, '2025-10-01 09:30:00', '9:20 10分後到着連絡あり');