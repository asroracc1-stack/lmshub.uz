package com.lmscrm.backend.dto.communication;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChatMessageDto {
    private UUID id;
    private UUID threadId;
    private UUID senderId;
    private String senderName;
    private String body;
    private LocalDateTime createdAt;
}
