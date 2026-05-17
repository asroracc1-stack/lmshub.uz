package com.lmscrm.backend.controller.student;

import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.InvoiceStatus;
import com.lmscrm.backend.dto.academic.AttendanceDto;
import com.lmscrm.backend.dto.academic.GradeDto;
import com.lmscrm.backend.repository.GroupMemberRepository;
import com.lmscrm.backend.repository.InvoiceRepository;
import com.lmscrm.backend.repository.StudentAttemptRepository;
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

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Student Academic Controller", description = "Endpoints for students to view their attendance and grades")
public class StudentAcademicController {

    private final AttendanceService attendanceService;
    private final GradeService gradeService;
    
    private final GroupMemberRepository groupMemberRepository;
    private final StudentAttemptRepository studentAttemptRepository;
    private final InvoiceRepository invoiceRepository;

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
    public ResponseEntity<Map<String, Object>> getDashboardSummary(@AuthenticationPrincipal User user) {
        // 1. Group Count
        long groupsCount = 0;
        if (user.getGroupId() != null) {
            groupsCount = 1;
        } else {
            groupsCount = groupMemberRepository.findByStudentId(user.getId()).size();
        }

        // 2. IELTS Mock Exams Count & Avg Band Score
        List<StudentAttempt> attempts = studentAttemptRepository.findAllByStudentId(user.getId());
        long mockExamsCount = attempts.size();
        
        double avgBand = attempts.stream()
                .filter(a -> a.getOverallBand() != null)
                .mapToDouble(StudentAttempt::getOverallBand)
                .average()
                .orElse(0.0);

        // 3. Balance / Pending Payments
        List<Invoice> invoices = invoiceRepository.findByStudentId(user.getId());
        BigDecimal pendingBalance = invoices.stream()
                .filter(i -> i.getStatus() != InvoiceStatus.PAID && i.getStatus() != InvoiceStatus.CANCELLED)
                .map(Invoice::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> summary = new HashMap<>();
        summary.put("myGroupsCount", groupsCount);
        summary.put("mockExamsCount", mockExamsCount);
        summary.put("averageBandScore", mockExamsCount == 0 ? "—" : String.format("%.1f", avgBand));
        summary.put("pendingBalance", pendingBalance);
        summary.put("coins", user.getCoins() != null ? user.getCoins() : 0);
        summary.put("nextExam", user.getExamDate() != null ? user.getExamDate().toString() : "—");

        return ResponseEntity.ok(summary);
    }
}
