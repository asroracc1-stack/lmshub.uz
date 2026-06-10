package com.lmscrm.backend.dto.chat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateConversationRequest {
    @NotNull
    private UUID targetUserId;
    
    private String title;
}
