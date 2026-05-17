package com.lmscrm.backend.controller.student;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.AttendanceDto;
import com.lmscrm.backend.dto.academic.GradeDto;
import com.lmscrm.backend.service.academic.AttendanceService;
import com.lmscrm.backend.service.academic.GradeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Student Academic Controller", description = "Endpoints for students to view their attendance and grades")
public class StudentAcademicController {

    private final AttendanceService attendanceService;
    private final GradeService gradeService;

    @GetMapping("/attendance")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(
            summary = "Get My Attendance",
            description = "Returns a list of all attendance records for the authenticated student. Students cannot view attendance records of other students."
    )
    public ResponseEntity<List<AttendanceDto>> getMyAttendance(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(attendanceService.getMyAttendance(user.getId()));
    }

    @GetMapping("/grades")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(
            summary = "Get My Grades",
            description = "Returns a list of all grades/scores assigned to the authenticated student."
    )
    public ResponseEntity<List<GradeDto>> getMyGrades(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(gradeService.getStudentGrades(user.getId()));
    }

    @GetMapping("/dashboard/summary")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(
            summary = "Get Dashboard Summary",
            description = "Returns high-level statistics for the student dashboard."
    )
    public ResponseEntity<java.util.Map<String, Object>> getDashboardSummary(@AuthenticationPrincipal User user) {
        List<GradeDto> grades = gradeService.getStudentGrades(user.getId());
        double avgScore = grades.stream()
                .filter(g -> g.getScore() != null)
                .mapToDouble(GradeDto::getScore)
                .average()
                .orElse(0.0);
                
        return ResponseEntity.ok(java.util.Map.of(
                "examsTaken", grades.size(),
                "averageScore", grades.isEmpty() ? "—" : String.format("%.1f", avgScore),
                "coins", user.getCoins() != null ? user.getCoins() : 0,
                "nextExam", user.getExamDate() != null ? user.getExamDate().toString() : "—"
        ));
    }
}
