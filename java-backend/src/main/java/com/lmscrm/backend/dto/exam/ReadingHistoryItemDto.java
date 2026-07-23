package com.lmscrm.backend.dto.exam;

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
public class ReadingHistoryItemDto {
    private UUID attemptId;
    private UUID examId;
    private String testTitle;
    private String passageTitle;
    private LocalDateTime finishedAt;
    private Integer durationMinutes;
    private String difficulty;
    private String partType;
    private Integer correctAnswers;
    private Integer totalQuestions;
    private Double overallBand;
}
