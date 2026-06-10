package com.lmscrm.backend.controller.communication;

import com.lmscrm.backend.domain.entity.User;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class WebSocketChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final com.lmscrm.backend.service.communication.ChatService chatService;

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingPayload payload, SimpMessageHeaderAccessor headerAccessor) {
        if (payload.getReceiverEmail() != null) {
            messagingTemplate.convertAndSendToUser(
                    payload.getReceiverEmail(),
                    "/queue/typing",
                    payload
            );
        }
    }

    @MessageMapping("/chat.seen")
    public void messageSeen(@Payload SeenPayload payload, SimpMessageHeaderAccessor headerAccessor) {
        if (payload.getMessageId() != null) {
            chatService.markMessageAsSeen(payload.getMessageId());
        }
        
        if (payload.getReceiverEmail() != null) {
            messagingTemplate.convertAndSendToUser(
                    payload.getReceiverEmail(),
                    "/queue/seen",
                    payload
            );
        }
    }

    @Data
    public static class TypingPayload {
        private UUID threadId;
        private String receiverEmail;
        private boolean isTyping;
        private UUID senderId;
    }

    @Data
    public static class SeenPayload {
        private UUID messageId;
        private UUID threadId;
        private String receiverEmail;
    }
}
