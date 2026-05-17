package com.lmscrm.backend.dto.communication;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class BroadcastMessageRequest {

    @NotNull
    private UUID groupId;

    @NotBlank
    private String message;
}
