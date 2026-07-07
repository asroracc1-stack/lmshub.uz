package com.lmscrm.backend.dto.academic;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.time.LocalTime;
import java.util.UUID;

@Data
public class WeeklyScheduleDto {
    private UUID id;

    @JsonAlias({"groupId", "group_id"})
    private UUID groupId;

    @JsonAlias({"groupName", "group_name"})
    private String groupName;

    @JsonAlias({"subjectId", "subject_id"})
    private UUID subjectId;

    @JsonAlias({"subjectName", "subject_name"})
    private String subjectName;

    @JsonAlias({"teacherId", "teacher_id"})
    private UUID teacherId;

    @JsonAlias({"teacherName", "teacher_name"})
    private String teacherName;

    @JsonAlias({"classroomId", "classroom_id"})
    private UUID classroomId;

    @JsonAlias({"classroomName", "classroom_name"})
    private String classroomName;

    private String room;

    @JsonAlias({"dayOfWeek", "day_of_week"})
    private Integer dayOfWeek;

    @JsonAlias({"startTime", "start_time"})
    private LocalTime startTime;

    @JsonAlias({"endTime", "end_time"})
    private LocalTime endTime;

    @JsonAlias({"organizationId", "organization_id"})
    private UUID organizationId;
}
