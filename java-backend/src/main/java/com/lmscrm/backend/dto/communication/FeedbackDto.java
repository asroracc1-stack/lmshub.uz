package com.lmscrm.backend.dto.communication;

import com.lmscrm.backend.domain.enums.FeedbackStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class FeedbackDto {
    @com.fasterxml.jackson.annotation.JsonProperty("id")
    private UUID id;
    @com.fasterxml.jackson.annotation.JsonProperty("userId")
    private UUID userId;
    @com.fasterxml.jackson.annotation.JsonProperty("userEmail")
    private String userEmail;
    @com.fasterxml.jackson.annotation.JsonProperty("subject")
    private String subject;
    @com.fasterxml.jackson.annotation.JsonProperty("message")
    private String message;
    @com.fasterxml.jackson.annotation.JsonProperty("status")
    private FeedbackStatus status;
    @com.fasterxml.jackson.annotation.JsonProperty("supportComment")
    private String supportComment;
    @com.fasterxml.jackson.annotation.JsonProperty("createdAt")
    private LocalDateTime createdAt;
    @com.fasterxml.jackson.annotation.JsonProperty("updatedAt")
    private LocalDateTime updatedAt;
}
