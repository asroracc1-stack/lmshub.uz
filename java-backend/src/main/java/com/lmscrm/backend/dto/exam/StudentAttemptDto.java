package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class StudentAttemptDto {
    private UUID id;
    private UUID examId;
    private String examTitle;
    private UUID studentId;
    private String studentName;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Long elapsedSeconds;
    private Integer totalScore;
    private Integer maxScore;
    private Boolean isPassed;
    private String attemptSeed;
}
