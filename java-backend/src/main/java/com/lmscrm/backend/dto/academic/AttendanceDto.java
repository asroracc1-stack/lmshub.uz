package com.lmscrm.backend.dto.academic;

import com.lmscrm.backend.domain.enums.AttendanceStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AttendanceDto {
    @com.fasterxml.jackson.annotation.JsonProperty("id")
    private UUID id;
    @com.fasterxml.jackson.annotation.JsonProperty("lessonId")
    private UUID lessonId;
    @com.fasterxml.jackson.annotation.JsonProperty("studentId")
    private UUID studentId;
    @com.fasterxml.jackson.annotation.JsonProperty("studentName")
    private String studentName;
    @com.fasterxml.jackson.annotation.JsonProperty("status")
    private AttendanceStatus status;
    @com.fasterxml.jackson.annotation.JsonProperty("note")
    private String note;
    @com.fasterxml.jackson.annotation.JsonProperty("createdAt")
    private LocalDateTime createdAt;
}
