package com.lmscrm.backend.dto.academic;

import com.lmscrm.backend.domain.enums.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Talaba uchun dars ma'lumotlarini API orqali qaytarish.
 * Bu DTO `LessonDto`dan ajratilgan, chunki unga qo'shimcha
 * `attendanceStatus` va `teacherName` maydonlari kerak.
 */
@Data
@AllArgsConstructor
public class StudentLessonDto {
    @com.fasterxml.jackson.annotation.JsonProperty("id")
    private UUID id;
    @com.fasterxml.jackson.annotation.JsonProperty("title")
    private String title;
    @com.fasterxml.jackson.annotation.JsonProperty("startsAt")
    private LocalDateTime startsAt;
    @com.fasterxml.jackson.annotation.JsonProperty("endsAt")
    private LocalDateTime endsAt;
    @com.fasterxml.jackson.annotation.JsonProperty("attendanceStatus")
    private AttendanceStatus attendanceStatus;
    @com.fasterxml.jackson.annotation.JsonProperty("teacherName")
    private String teacherName;
    @com.fasterxml.jackson.annotation.JsonProperty("groupName")
    private String groupName;
    @com.fasterxml.jackson.annotation.JsonProperty("subjectName")
    private String subjectName;
    @com.fasterxml.jackson.annotation.JsonProperty("room")
    private String room;
    @com.fasterxml.jackson.annotation.JsonProperty("description")
    private String description;
}
