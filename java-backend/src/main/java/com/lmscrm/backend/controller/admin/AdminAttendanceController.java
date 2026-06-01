package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.Lesson;
import com.lmscrm.backend.domain.entity.GroupMember;
import com.lmscrm.backend.domain.entity.Attendance;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.GroupMemberRepository;
import com.lmscrm.backend.repository.AttendanceRepository;
import com.lmscrm.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/attendance")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Admin Attendance Controller", description = "Endpoints for managing student attendance")
public class AdminAttendanceController {

    private final LessonRepository lessonRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @GetMapping("/lesson/{lessonId}/students")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Get students for a specific lesson to mark attendance")
    public ResponseEntity<?> getStudentsForLesson(@PathVariable UUID lessonId) {
        log.info("Yo'qlama uchun talabalar so'ralmoqda. LessonId: {}", lessonId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Lesson not found"));

        UUID groupId = lesson.getGroup().getId();
        List<GroupMember> members = groupMemberRepository.findAllByGroupId(groupId);

        var students = members.stream().map(member -> {
            var s = member.getStudent();
            return new java.util.HashMap<String, Object>() {{
                put("id", s.getId());
                put("full_name", s.getFullName());
                put("username", s.getUsername());
            }};
        }).collect(Collectors.toList());

        return ResponseEntity.ok(students);
    }

    @PostMapping("/lesson/{lessonId}/submit")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Save or update attendance for a specific lesson")
    public ResponseEntity<?> submitAttendance(
            @PathVariable UUID lessonId,
            @RequestBody List<Map<String, Object>> attendanceData,
            @AuthenticationPrincipal User currentUser) {
        
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        for (Map<String, Object> data : attendanceData) {
            UUID studentId = UUID.fromString(data.get("student_id").toString());
            AttendanceStatus status = AttendanceStatus.valueOf(data.get("status").toString());
            String note = (String) data.get("note");

            Attendance attendance = attendanceRepository
                    .findByLessonIdAndStudentId(lessonId, studentId)
                    .orElse(Attendance.builder()
                            .lesson(lesson)
                            .student(userRepository.getReferenceById(studentId))
                            .organization(lesson.getOrganization())
                            .build());

            attendance.setStatus(status);
            attendance.setNote(note);
            attendance.setMarkedBy(currentUser);
            attendanceRepository.save(attendance);
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Yo'qlama saqlandi"));
    }
}