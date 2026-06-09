package com.lmscrm.backend.dto.communication;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.lmscrm.backend.domain.enums.FeedbackType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentFeedbackDto {
    private UUID id;

    @JsonAlias({"studentId", "student_id"})
    private UUID studentId;

    private String studentName;

    @JsonAlias({"teacherId", "teacher_id"})
    private UUID teacherId;

    private String teacherName;

    @JsonAlias({"organizationId", "organization_id"})
    private UUID organizationId;

    private String title;
    private String body;
    private FeedbackType type;

    @JsonAlias({"createdAt", "created_at"})
    private LocalDateTime createdAt;
}
