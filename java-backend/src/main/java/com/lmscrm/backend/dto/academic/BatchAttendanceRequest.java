package com.lmscrm.backend.dto.academic;

import com.lmscrm.backend.domain.enums.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class BatchAttendanceRequest {

    @NotNull
    private UUID lessonId;

    private List<StudentAttendance> records;

    @Data
    public static class StudentAttendance {
        @NotNull
        private UUID studentId;

        @NotNull
        private AttendanceStatus status;

        private String note;
    }
}
