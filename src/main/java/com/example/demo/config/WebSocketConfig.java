package com.example.demo.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker 
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

 @Override
 public void configureMessageBroker(MessageBrokerRegistry config) {
     // クライアントが購読するトピックのプレフィックス (例: /topic/updates)
     config.enableSimpleBroker("/topic");
     
     // クライアントがサーバーにメッセージを送信する際のプレフィックス (今回は使用しないが定義は必要)
     config.setApplicationDestinationPrefixes("/app");
 }

 @Override
 public void registerStompEndpoints(StompEndpointRegistry registry) {
     // WebSocket接続のエンドポイント
     registry.addEndpoint("/ws").withSockJS(); 
 }
}
