package com.lmscrm.backend.dto.communication;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChatThreadDto {
    private UUID id;
    private String title;
    private Boolean isGroup;
    private UUID groupId;
    private LocalDateTime createdAt;
    private java.util.List<ChatParticipantDto> participants;
}
