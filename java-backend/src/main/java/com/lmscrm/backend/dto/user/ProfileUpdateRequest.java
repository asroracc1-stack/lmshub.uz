package com.lmscrm.backend.dto.user;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class ProfileUpdateRequest {
    @JsonAlias({"fullName", "full_name"})
    private String fullName;
    
    private String email;
    
    @JsonAlias({"phoneNumber", "phone_number", "phone"})
    private String phoneNumber;
}
