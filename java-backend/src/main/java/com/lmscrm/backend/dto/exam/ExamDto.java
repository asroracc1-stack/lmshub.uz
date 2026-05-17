package com.lmscrm.backend.dto.exam;

import com.lmscrm.backend.domain.enums.ExamType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ExamDto {
    private UUID id;
    private String title;
    private String description;
    private ExamType type;
    private String difficulty;
    private String audioUrl;
    private Integer durationMinutes;
    private Integer passingScore;
    private UUID subjectId;
    private String subjectName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Boolean isActive;
    // Exam player uchun - passages va ichidagi questions
    private List<PassageDto> passages;
}
