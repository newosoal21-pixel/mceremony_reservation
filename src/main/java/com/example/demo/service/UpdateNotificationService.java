// src/main/java/com/example/demo/service/UpdateNotificationService.java (修正 V8.0)

package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.demo.model.RemoteUpdateMessage; // 💡 RemoteUpdateMessage に変更

@Service
public class UpdateNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public UpdateNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * WebSocketで全てのクライアントに更新メッセージをブロードキャストする。
     * 💡 引数をクライアントが必要な全情報に変更
     */
    public void notifyClients(String id, String field, String newValue, 
                              String extraField, String extraValue, 
                              String updateTime, String entityType, String message) {
                                  
        // 💡 全ての情報を含む DTO (RemoteUpdateMessage) を作成
        RemoteUpdateMessage update = new RemoteUpdateMessage(
            id, field, newValue, extraField, extraValue, 
            updateTime, entityType, message
        );

        // 💡 /topic/updates へメッセージを送信（JSONに自動変換される）
        messagingTemplate.convertAndSend("/topic/updates", update);
        System.out.println("DEBUG: WebSocketメッセージ送信: " + update.toString());
    }
}