package com.lmscrm.backend.dto.academic;

import com.lmscrm.backend.domain.enums.AttendanceStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AttendanceDto {
    private UUID id;
    private UUID lessonId;
    private UUID studentId;
    private String studentName;
    private AttendanceStatus status;
    private String note;
    private LocalDateTime createdAt;
}
