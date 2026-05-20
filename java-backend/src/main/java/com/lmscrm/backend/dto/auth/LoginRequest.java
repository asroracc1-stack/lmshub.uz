package com.lmscrm.backend.dto.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Username or Email is required")
    @JsonProperty("username_or_email")
    private String usernameOrEmail;

    @NotBlank(message = "Password is required")
    private String password;
}
