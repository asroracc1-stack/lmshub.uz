package com.lmscrm.backend.dto;

import com.lmscrm.backend.domain.enums.AppRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ParentResponse {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String telegramUsername;
    private AppRole role;
    private boolean active;
    private LocalDateTime createdAt;
    private String defaultPassword; // To return the generated password to the frontend
}
