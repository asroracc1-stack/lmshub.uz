package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.Attendance;
import com.lmscrm.backend.domain.entity.StudentFeedback;
import com.lmscrm.backend.domain.entity.Grade;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.dto.academic.AttendanceDto;
import com.lmscrm.backend.dto.academic.GradeDto;
import com.lmscrm.backend.dto.academic.StudentAnalyticsDto;
import com.lmscrm.backend.dto.communication.StudentFeedbackDto;
import com.lmscrm.backend.repository.AttendanceRepository;
import com.lmscrm.backend.repository.StudentFeedbackRepository;
import com.lmscrm.backend.repository.GradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Talaba uchun to'liq akademik statistika hisoblash servisi.
 * Baholar, davomat va o'qituvchi fikrlarini agregatsiya qiladi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StudentAnalyticsService {

    private final GradeRepository gradeRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentFeedbackRepository studentFeedbackRepository;

    @Transactional(readOnly = true)
    public StudentAnalyticsDto getAnalytics(UUID studentId) {

        // ─── 1. BAHOLAR ───────────────────────────────────────────────────────
        List<Grade> grades = gradeRepository.findByStudentId(studentId);

        double totalScore = grades.stream().mapToDouble(g -> g.getScore() != null ? g.getScore() : 0).sum();
        double totalMax   = grades.stream().mapToDouble(g -> g.getMaxScore() != null ? g.getMaxScore() : 5).sum();
        double averageScore = totalMax > 0 ? (totalScore / totalMax) * 100.0 : 0.0;

        List<GradeDto> gradeDtos = grades.stream().map(g -> {
            GradeDto dto = new GradeDto();
            dto.setId(g.getId());
            dto.setStudentId(g.getStudent() != null ? g.getStudent().getId() : null);
            dto.setStudentName(g.getStudent() != null ? g.getStudent().getFullName() : "");
            dto.setTeacherId(g.getTeacher() != null ? g.getTeacher().getId() : null);
            dto.setSubjectId(g.getSubject() != null ? g.getSubject().getId() : null);
            dto.setSubjectName(g.getSubject() != null ? g.getSubject().getName() : "");
            dto.setLessonId(g.getLesson() != null ? g.getLesson().getId() : null);
            dto.setScore(g.getScore());
            dto.setMaxScore(g.getMaxScore());
            dto.setComment(g.getComment());
            dto.setCreatedAt(g.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());

        // ─── 2. DAVOMAT ───────────────────────────────────────────────────────
        List<Attendance> attendanceList = attendanceRepository.findByStudentId(studentId);

        long presentCount = attendanceList.stream()
                .filter(a -> a.getStatus() == AttendanceStatus.PRESENT || a.getStatus() == AttendanceStatus.LATE)
                .count();
        double attendanceRate = !attendanceList.isEmpty()
                ? (presentCount / (double) attendanceList.size()) * 100.0
                : 0.0;

        List<AttendanceDto> attendanceDtos = attendanceList.stream().map(a -> {
            AttendanceDto dto = new AttendanceDto();
            dto.setId(a.getId());
            dto.setLessonId(a.getLesson() != null ? a.getLesson().getId() : null);
            dto.setStudentId(a.getStudent() != null ? a.getStudent().getId() : null);
            dto.setStudentName(a.getStudent() != null ? a.getStudent().getFullName() : "");
            dto.setStatus(a.getStatus());
            dto.setNote(a.getNote());
            dto.setCreatedAt(a.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());

        // ─── 3. FEEDBACKS (o'qituvchi fikrlari) ──────────────────────────────
        List<StudentFeedback> feedbackList = studentFeedbackRepository.findByStudentIdOrderByCreatedAtDesc(studentId);

        List<StudentFeedbackDto> feedbackDtos = feedbackList.stream().map(f -> {
            return StudentFeedbackDto.builder()
                    .id(f.getId())
                    .studentId(f.getStudent().getId())
                    .studentName(f.getStudent().getFullName() != null ? f.getStudent().getFullName() : f.getStudent().getUsername())
                    .teacherId(f.getTeacher().getId())
                    .teacherName(f.getTeacher().getFullName() != null ? f.getTeacher().getFullName() : f.getTeacher().getUsername())
                    .organizationId(f.getOrganization().getId())
                    .title(f.getTitle())
                    .body(f.getBody())
                    .type(f.getType())
                    .createdAt(f.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());

        return StudentAnalyticsDto.builder()
                .averageScore(Math.round(averageScore * 10.0) / 10.0)
                .totalGrades(grades.size())
                .attendanceRate(Math.round(attendanceRate * 10.0) / 10.0)
                .totalLessons(attendanceList.size())
                .grades(gradeDtos)
                .attendance(attendanceDtos)
                .feedbacks(feedbackDtos)
                .build();
    }
}
