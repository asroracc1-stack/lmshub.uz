package com.lmscrm.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ParentCreateRequest {
    @NotNull(message = "Student ID cannot be null")
    private UUID studentId;

    @NotBlank(message = "Full name cannot be blank")
    private String fullName;

    @NotBlank(message = "Phone number cannot be blank")
    private String phoneNumber;

    private String email;
    private String telegramUsername;
}
