package com.lmscrm.backend.dto.user;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PasswordChangeRequest {
    @NotBlank(message = "Joriy parol bo'sh bo'lmasligi kerak")
    @JsonProperty("currentPassword")
    @JsonAlias("current_password")
    private String currentPassword;

    @NotBlank(message = "Yangi parol bo'sh bo'lmasligi kerak")
    @Size(min = 8, message = "Yangi parol kamida 8 ta belgi bo'lishi kerak")
    @JsonProperty("newPassword")
    @JsonAlias("new_password")
    private String newPassword;
}
