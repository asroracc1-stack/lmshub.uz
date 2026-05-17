package com.lmscrm.backend.dto.academic;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class SubjectDto {
    private UUID id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
}
