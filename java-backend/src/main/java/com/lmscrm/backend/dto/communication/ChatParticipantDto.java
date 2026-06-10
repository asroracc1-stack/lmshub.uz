package com.lmscrm.backend.dto.communication;

import com.lmscrm.backend.dto.admin.UserSummaryDto;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ChatParticipantDto {
    private UUID id;
    private UUID userId;
    private UserSummaryDto user;
    private LocalDateTime joinedAt;
}
