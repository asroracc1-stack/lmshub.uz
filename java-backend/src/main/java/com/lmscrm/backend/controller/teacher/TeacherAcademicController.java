package com.lmscrm.backend.controller.teacher;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.AttendanceDto;
import com.lmscrm.backend.dto.academic.BatchAttendanceRequest;
import com.lmscrm.backend.dto.academic.GradeDto;
import com.lmscrm.backend.dto.academic.GroupDto;
import com.lmscrm.backend.dto.academic.DashboardBatchRequest;
import com.lmscrm.backend.service.academic.AttendanceService;
import com.lmscrm.backend.service.academic.GradeService;
import com.lmscrm.backend.service.academic.GroupService;
import com.lmscrm.backend.service.academic.DashboardBatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher Academic Controller", description = "Endpoints for teachers to manage their groups, attendance, and grades")
public class TeacherAcademicController {

    private final GroupService groupService;
    private final AttendanceService attendanceService;
    private final GradeService gradeService;
    private final DashboardBatchService dashboardBatchService;

    @GetMapping("/groups/{groupId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN') or (hasRole('TEACHER') and @securityUtils.isTeacherOfGroup(#groupId))")
    @Operation(
            summary = "Get Group Details",
            description = "Returns the details of a specific group, including its assigned teachers and subjects. Teachers can only view groups they are assigned to. Security: Verified via @securityUtils."
    )
    public ResponseEntity<GroupDto> getGroupDetails(@PathVariable UUID groupId) {
        return ResponseEntity.ok(groupService.getGroupWithTeachers(groupId));
    }

    @PostMapping("/attendance/batch")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(
            summary = "Mark Batch Attendance",
            description = "Allows a teacher to submit attendance for multiple students for a specific lesson in one request. Triggers a warning log if a student is absent 3 or more times."
    )
    public ResponseEntity<List<AttendanceDto>> markBatchAttendance(
            @Valid @RequestBody BatchAttendanceRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attendanceService.markBatchAttendance(request, user));
    }

    @PostMapping("/attendance")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(
            summary = "Mark Single Attendance",
            description = "Allows a teacher to toggle or set attendance for a single student for a specific lesson."
    )
    public ResponseEntity<AttendanceDto> markSingleAttendance(
            @Valid @RequestBody AttendanceDto request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(attendanceService.markSingleAttendance(request, user));
    }

    @PostMapping("/grades")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(
            summary = "Add Student Grade",
            description = "Allows a teacher to assign a grade/score to a specific student for a specific subject/lesson."
    )
    public ResponseEntity<GradeDto> addGrade(
            @Valid @RequestBody GradeDto request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(gradeService.addGrade(request, user));
    }

    @PostMapping("/attendance/save-all")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(
            summary = "Save All Smart Dashboard Data",
            description = "Allows a teacher to submit attendance, grades, comments, and coins for multiple students at once. Sends asynchronous Telegram notifications."
    )
    public ResponseEntity<Void> saveAllDashboardData(
            @Valid @RequestBody DashboardBatchRequest request,
            @AuthenticationPrincipal User user) {
        dashboardBatchService.saveAllDashboardData(request, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/attendance")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Get Attendance Records by Lesson IDs")
    public ResponseEntity<List<AttendanceDto>> getAttendanceForLessons(@RequestParam List<UUID> lessonIds) {
        return ResponseEntity.ok(attendanceService.getAttendanceForLessons(lessonIds));
    }

    @GetMapping("/grades")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Get Grades by Student IDs and Subject ID")
    public ResponseEntity<List<GradeDto>> getGradesForStudentsAndSubject(
            @RequestParam List<UUID> studentIds,
            @RequestParam UUID subjectId) {
        return ResponseEntity.ok(gradeService.getGradesForStudentsAndSubject(studentIds, subjectId));
    }
}
