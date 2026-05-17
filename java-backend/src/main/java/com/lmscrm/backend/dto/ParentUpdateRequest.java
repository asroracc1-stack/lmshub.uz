package com.lmscrm.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class ParentUpdateRequest {
    private UUID studentId; // Optional for update

    @NotBlank(message = "Full name cannot be blank")
    private String fullName;

    @NotBlank(message = "Phone number cannot be blank")
    private String phoneNumber;

    private String email;
    private String telegramUsername;
}
