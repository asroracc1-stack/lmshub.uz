package com.lmscrm.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class StudentSearchResponse {
    private UUID id;
    private String fullName;
}
