package com.lmscrm.backend.dto.chat;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ChatMessageDto {
    private UUID id;
    private String body;
    private String attachmentUrl;
    private UUID senderId;
    private ChatUserDto sender;
    private UUID conversationId;
    private LocalDateTime createdAt;
}
