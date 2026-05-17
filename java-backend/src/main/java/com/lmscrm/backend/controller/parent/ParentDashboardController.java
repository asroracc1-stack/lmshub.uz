package com.lmscrm.backend.controller.parent;

import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.AttendanceDto;
import com.lmscrm.backend.dto.academic.GradeDto;
import com.lmscrm.backend.service.academic.AttendanceService;
import com.lmscrm.backend.service.academic.GradeService;
import com.lmscrm.backend.service.parent.ParentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/parent")
@RequiredArgsConstructor
public class ParentDashboardController {

    private final AttendanceService attendanceService;
    private final GradeService gradeService;
    private final ParentService parentService;

    @GetMapping("/children")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<List<Profile>> getMyChildren(@AuthenticationPrincipal User parent) {
        return ResponseEntity.ok(parentService.getMyChildren(parent.getId()));
    }

    // A Parent can view their children's grades
    @GetMapping("/children/{studentId}/grades")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<List<GradeDto>> getChildGrades(
            @PathVariable UUID studentId,
            @AuthenticationPrincipal User parent) {
        if (!parentService.isMyChild(parent.getId(), studentId)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(gradeService.getStudentGrades(studentId));
    }

    // A Parent can view their children's attendance
    @GetMapping("/children/{studentId}/attendance")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<List<AttendanceDto>> getChildAttendance(
            @PathVariable UUID studentId,
            @AuthenticationPrincipal User parent) {
        if (!parentService.isMyChild(parent.getId(), studentId)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(attendanceService.getMyAttendance(studentId));
    }

    // A Parent can view their children's teachers (for messaging)
    @GetMapping("/teachers")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<List<Profile>> getMyTeachers(@AuthenticationPrincipal User parent) {
        return ResponseEntity.ok(parentService.getMyTeachers(parent.getId()));
    }
}
