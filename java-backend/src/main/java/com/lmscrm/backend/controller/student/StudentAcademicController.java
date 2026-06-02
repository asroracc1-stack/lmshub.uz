package com.lmscrm.backend.controller.student;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.AttendanceDto;
import com.lmscrm.backend.dto.academic.GradeDto;
import com.lmscrm.backend.dto.response.StudentDashboardSummaryDto;
import com.lmscrm.backend.repository.GroupMemberRepository;
import com.lmscrm.backend.repository.InvoiceRepository;
import com.lmscrm.backend.repository.StudentAttemptRepository;
import com.lmscrm.backend.service.academic.AttendanceService;
import com.lmscrm.backend.service.academic.GradeService;
import com.lmscrm.backend.service.academic.StudentLessonService;
import com.lmscrm.backend.service.academic.StudentAnalyticsService;
import com.lmscrm.backend.dto.academic.StudentLessonResponse;
import com.lmscrm.backend.dto.academic.StudentAnalyticsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Student Academic Controller", description = "Endpoints for students to view attendance, grades and dashboard stats")
public class StudentAcademicController {

    private final AttendanceService attendanceService;
    private final GradeService gradeService;
    private final StudentLessonService studentLessonService;
    private final StudentAnalyticsService studentAnalyticsService;

    private final GroupMemberRepository groupMemberRepository;
    private final StudentAttemptRepository studentAttemptRepository;
    private final InvoiceRepository invoiceRepository;

    @GetMapping("/attendance")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get My Attendance")
    public ResponseEntity<List<AttendanceDto>> getMyAttendance(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(attendanceService.getMyAttendance(user.getId()));
    }

    @GetMapping("/grades")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get My Grades")
    public ResponseEntity<List<GradeDto>> getMyGrades(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(gradeService.getStudentGrades(user.getId()));
    }

    @GetMapping("/my-courses")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get My Courses/Lessons")
    public ResponseEntity<StudentLessonResponse> getMyCourses(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(studentLessonService.getLessonsForStudent(user.getId()));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get My Analytics")
    public ResponseEntity<StudentAnalyticsDto> getMyAnalytics(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(studentAnalyticsService.getAnalytics(user.getId()));
    }

    /**
     * GET /api/v1/student/dashboard/summary
     *
     * <p>Talabaning dashboard kartalari uchun to'liq va to'g'ri statistika.</p>
     *
     * <h3>Guruhlar soni — IKKI MANBA birlashtiriladi:</h3>
     * <ul>
     *   <li>users.group_id ustuni null emas → +1 guruh</li>
     *   <li>group_members jadvalidagi faol (isActive=true) guruhlar → COUNT()</li>
     * </ul>
     * <p>Ikkisini deduplication bilan birlashtirish murakkab bo'lgani uchun
     * ikki manba bo'lsa ham maksimalni olamiz: agar users.group_id bor va
     * group_members da ham ko'rinsa, group_members COUNT to'g'ri bo'ladi.
     * Agar group_members bo'sh va users.group_id bor bo'lsa, 1 qaytaramiz.</p>
     *
     * <h3>Balans — payment_transactions.PENDING:</h3>
     * <p>Student Payment sahifasida ko'rsatiladigan "Kutilmoqda" to'lovlar
     * payment_transactions jadvalida saqlanadi, invoices jadvalida emas.</p>
     */
    @GetMapping("/dashboard/summary")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(
            summary = "Get Student Dashboard Summary",
            description = "Returns real-time statistics for the student dashboard cards."
    )
    public ResponseEntity<StudentDashboardSummaryDto> getDashboardSummary(
            @AuthenticationPrincipal User user) {

        UUID studentId = user.getId();

        try {
            // ── 1. GURUHLAR SONI ───────────────────────────────────────────────
            // Barcha biriktirilgan guruhlarni sanaymiz (isActive tekshiruvini olib tashladik, chunki ba'zi guruhlar default holatda active bo'lmasligi mumkin)
            long groupsFromMembers = groupMemberRepository.countByStudentId(studentId);

            long myGroupsCount;
            if (groupsFromMembers > 0) {
                myGroupsCount = groupsFromMembers;
            } else if (user.getGroupId() != null) {
                myGroupsCount = 1;
            } else {
                myGroupsCount = 0;
            }

            // ── 2. MOCK IMTIHONLAR SONI ────────────────────────────────────────
            long mockExamsCount = studentAttemptRepository.countByStudentId(studentId);

            // ── 3. O'RTACHA BAND SCORE ─────────────────────────────────────────
            Double averageBandScore = studentAttemptRepository
                    .findAverageOverallBandByStudentId(studentId);
            if (averageBandScore != null) {
                averageBandScore = BigDecimal.valueOf(averageBandScore)
                        .setScale(1, RoundingMode.HALF_UP)
                        .doubleValue();
            }

            // ── 4. BALANS (QARZDORLIK) — invoices ─────────────────────────────
            // Talabaning to'lanmagan (PENDING, SENT, OVERDUE) invoicelari yig'indisi
            BigDecimal pendingBalance = invoiceRepository.sumPendingBalanceByStudentId(studentId);
            Double pendingBalanceDouble = pendingBalance != null ? pendingBalance.doubleValue() : 0.0;

            // ── 5. COINLAR ────────────────────────────────────────────────────
            long coins = user.getCoins() != null ? user.getCoins() : 0L;

            // ── 6. KEYINGI IMTIHON SANASI ─────────────────────────────────────
            String nextExamDate = null;
            String nextExamLabel = null;
            if (user.getExamDate() != null) {
                nextExamDate = user.getExamDate().toString(); // YYYY-MM-DD
                nextExamLabel = user.getTargetBand() != null
                        ? "Maqsad: " + user.getTargetBand() + " band"
                        : "IELTS imtihon";
            }

            return ResponseEntity.ok(StudentDashboardSummaryDto.builder()
                    .myGroupsCount(myGroupsCount)
                    .mockExamsCount(mockExamsCount)
                    .averageBandScore(averageBandScore)
                    .pendingBalance(pendingBalanceDouble)
                    .coins(coins)
                    .nextExamDate(nextExamDate)
                    .nextExamLabel(nextExamLabel)
                    .build());

        } catch (Exception e) {
            log.error("Student dashboard summary xatosi. studentId={}", studentId, e);
            // Xatolik xabarini logga yozamiz
            return ResponseEntity.ok(StudentDashboardSummaryDto.builder()
                    .myGroupsCount(0)
                    .mockExamsCount(0)
                    .averageBandScore(null)
                    .pendingBalance(0.0)
                    .coins(0)
                    .nextExamDate(null)
                    .nextExamLabel("XATOLIK: " + e.getMessage())
                    .build());
        }
    }
}
