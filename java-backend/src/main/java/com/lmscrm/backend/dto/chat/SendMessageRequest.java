package com.lmscrm.backend.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SendMessageRequest {
    @NotNull
    private UUID conversationId;

    private String body;
    private String attachmentUrl;
}
