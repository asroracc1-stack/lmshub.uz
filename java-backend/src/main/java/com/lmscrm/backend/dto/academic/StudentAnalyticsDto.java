package com.lmscrm.backend.dto.academic;

import com.lmscrm.backend.dto.communication.FeedbackDto;
import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnalyticsDto {
    /** O'rtacha ball foizda (0-100) */
    @com.fasterxml.jackson.annotation.JsonProperty("averageScore")
    private double averageScore;

    /** Jami baholar soni */
    @com.fasterxml.jackson.annotation.JsonProperty("totalGrades")
    private int totalGrades;

    /** Davomat foizi (0-100) */
    @com.fasterxml.jackson.annotation.JsonProperty("attendanceRate")
    private double attendanceRate;

    /** Jami darslar soni (attendance yozuvlari) */
    @com.fasterxml.jackson.annotation.JsonProperty("totalLessons")
    private int totalLessons;

    /** Baholar ro'yxati */
    @com.fasterxml.jackson.annotation.JsonProperty("grades")
    private List<GradeDto> grades;

    /** Davomat ro'yxati */
    @com.fasterxml.jackson.annotation.JsonProperty("attendance")
    private List<AttendanceDto> attendance;

    /** Feedback ro'yxati */
    @com.fasterxml.jackson.annotation.JsonProperty("feedbacks")
    private List<FeedbackDto> feedbacks;
}
