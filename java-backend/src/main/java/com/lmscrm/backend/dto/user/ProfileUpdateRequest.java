package com.lmscrm.backend.dto.user;

import lombok.Data;

@Data
public class ProfileUpdateRequest {
    private String fullName;
    private String email;
    private String phoneNumber;
}
