package com.lmscrm.backend.dto.academic;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class GradeDto {
    @com.fasterxml.jackson.annotation.JsonProperty("id")
    private UUID id;
    @com.fasterxml.jackson.annotation.JsonProperty("studentId")
    private UUID studentId;
    @com.fasterxml.jackson.annotation.JsonProperty("studentName")
    private String studentName;
    @com.fasterxml.jackson.annotation.JsonProperty("teacherId")
    private UUID teacherId;
    @com.fasterxml.jackson.annotation.JsonProperty("subjectId")
    private UUID subjectId;
    @com.fasterxml.jackson.annotation.JsonProperty("subjectName")
    private String subjectName;
    @com.fasterxml.jackson.annotation.JsonProperty("lessonId")
    private UUID lessonId;
    @com.fasterxml.jackson.annotation.JsonProperty("score")
    private Integer score;
    @com.fasterxml.jackson.annotation.JsonProperty("maxScore")
    private Integer maxScore;
    @com.fasterxml.jackson.annotation.JsonProperty("comment")
    private String comment;
    @com.fasterxml.jackson.annotation.JsonProperty("createdAt")
    private LocalDateTime createdAt;
}
