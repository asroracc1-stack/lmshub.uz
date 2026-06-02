package com.lmscrm.backend.dto.academic;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class DashboardBatchRequest {

    @NotNull
    @JsonAlias({"lessonId", "lesson_id"})
    private UUID lessonId;

    @NotNull
    @JsonAlias({"subjectId", "subject_id"})
    private UUID subjectId;

    private List<StudentEntry> records;

    @Data
    public static class StudentEntry {
        @NotNull
        @JsonAlias({"studentId", "student_id"})
        private UUID studentId;

        @NotNull
        private AttendanceStatus status;

        private Integer score; // optional grade score

        private String comment; // optional feedback comment

        private Integer coins; // optional coins granted
    }
}
