package com.example.demo.dto;


public class NotificationDto {
 
 // 更新された行を特定するID (HTMLのtr[data-record-id]に対応)
 private String rowId;     
 
 // 更新されたフィールド名 (HTMLのtd[.js-remarks-field]などに対応)
 private String fieldName; 
 
 // トースト表示用のメッセージ
 private String message;   
 
 // 通知の種類 (クライアント側で判別用)
 private String type = "remote_update"; 

 public NotificationDto(String rowId, String fieldName, String message) {
     this.rowId = rowId;
     this.fieldName = fieldName;
     this.message = message;
 }
 
 // デシリアライズに必要
 public NotificationDto() {} 

 // GetterとSetter (JSON変換に必要)
 public String getRowId() { return rowId; }
 public void setRowId(String rowId) { this.rowId = rowId; }

 public String getFieldName() { return fieldName; }
 public void setFieldName(String fieldName) { this.fieldName = fieldName; }

 public String getMessage() { return message; }
 public void setMessage(String message) { this.message = message; }

 public String getType() { return type; }
 public void setType(String type) { this.type = type; }
}
