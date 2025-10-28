package com.example.demo.model;

/**
 * WebSocketでクライアントに送信する更新通知メッセージのデータ構造 (DTO)
 * common.js の handleRemoteUpdate が期待する全ての情報を含む。
 */
public class RemoteUpdateMessage {
    private String id;
    private String field;
    private String newValue;
    private String extraField; 
    private String extraValue; 
    private String updateTime; 
    private String entityType; 
    private String message;    
    
    // 💡 全引数コンストラクタ
    public RemoteUpdateMessage(String id, String field, String newValue, 
                               String extraField, String extraValue, 
                               String updateTime, String entityType, String message) {
        this.id = id;
        this.field = field;
        this.newValue = newValue;
        this.extraField = extraField;
        this.extraValue = extraValue;
        this.updateTime = updateTime;
        this.entityType = entityType;
        this.message = message;
    }
    
    // デシリアライズに必要（空コンストラクタ）
    public RemoteUpdateMessage() {} 

    // 💡 Getterメソッド (JSON変換に必要)
    public String getId() { return id; }
    public String getField() { return field; }
    public String getNewValue() { return newValue; }
    public String getExtraField() { return extraField; }
    public String getExtraValue() { return extraValue; }
    public String getUpdateTime() { return updateTime; }
    public String getEntityType() { return entityType; }
    public String getMessage() { return message; }
}
