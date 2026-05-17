package com.lmscrm.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationDto {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String logoUrl;
    private UUID planId;
    private AddressDto address;
    private String phone;
    private String email;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
