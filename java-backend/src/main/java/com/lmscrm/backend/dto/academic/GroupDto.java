package com.lmscrm.backend.dto.academic;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class GroupDto {
    private UUID id;
    private String name;
    private String description;
    private String color;
    private Boolean isActive;
    private UUID organizationId;
    private String direction;
    private UUID teacherId;
    private Long studentCount;

    // Nested teachers and subjects
    private List<GroupTeacherDto> teachers;

    private LocalDateTime createdAt;
}
