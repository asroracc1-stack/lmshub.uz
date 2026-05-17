package com.lmscrm.backend.dto.admin;

import com.lmscrm.backend.domain.enums.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class MessageRequestDto {
    private UUID receiverId;

    @NotBlank
    private String subject;

    @NotBlank
    private String content;

    @NotNull
    private MessageType type;
}
