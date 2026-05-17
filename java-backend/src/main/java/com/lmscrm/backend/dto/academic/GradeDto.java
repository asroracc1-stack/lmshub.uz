package com.lmscrm.backend.dto.academic;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class GradeDto {
    private UUID id;
    private UUID studentId;
    private String studentName;
    private UUID teacherId;
    private UUID subjectId;
    private String subjectName;
    private UUID lessonId;
    private Integer score;
    private Integer maxScore;
    private String comment;
    private LocalDateTime createdAt;
}
