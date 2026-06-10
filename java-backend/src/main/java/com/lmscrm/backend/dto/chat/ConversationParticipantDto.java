package com.lmscrm.backend.dto.chat;

import com.lmscrm.backend.dto.admin.UserSummaryDto;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ConversationParticipantDto {
    private UUID id;
    private UUID userId;
    private ChatUserDto user;
    private LocalDateTime joinedAt;
}
