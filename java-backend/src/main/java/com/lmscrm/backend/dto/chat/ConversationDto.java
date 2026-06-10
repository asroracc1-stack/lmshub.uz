package com.lmscrm.backend.dto.chat;

import com.lmscrm.backend.dto.admin.UserSummaryDto;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ConversationDto {
    private UUID id;
    private String title;
    private Boolean isGroup;
    private UUID organizationId;
    private LocalDateTime createdAt;
    private List<ConversationParticipantDto> participants;
    private List<ChatMessageDto> messages;
}
