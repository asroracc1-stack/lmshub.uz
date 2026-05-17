package com.lmscrm.backend.dto.communication;

import com.lmscrm.backend.domain.enums.FeedbackStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class FeedbackDto {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String subject;
    private String message;
    private FeedbackStatus status;
    private String supportComment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
