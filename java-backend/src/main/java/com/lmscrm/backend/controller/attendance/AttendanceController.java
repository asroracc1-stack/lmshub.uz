package com.lmscrm.backend.controller.attendance;

import com.lmscrm.backend.domain.entity.AttendanceEngineSession;
import com.lmscrm.backend.domain.entity.AttendanceRecord;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.service.ai.AttendanceEngineService;
import com.lmscrm.backend.service.academic.FallbackAttendanceService;
import com.lmscrm.backend.repository.AttendanceRecordRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceEngineService engineService;
    private final FallbackAttendanceService fallbackService;
    private final AttendanceRecordRepository attendanceRepo;

    @PostMapping("/session/start/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'MANAGER')")
    public ResponseEntity<AttendanceEngineSession> startSession(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(engineService.startSession(lessonId));
    }

    @PostMapping("/session/end/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER', 'MANAGER')")
    public ResponseEntity<Void> endSession(@PathVariable UUID lessonId) {
        engineService.finalizeSession(lessonId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/rfid-checkin")
    public ResponseEntity<AttendanceRecord> checkInWithRfid(@RequestParam String cardUid) {
        return ResponseEntity.ok(fallbackService.checkInWithRfid(cardUid));
    }

    @PostMapping("/qr-generate/{lessonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<String> generateQrToken(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(fallbackService.generateRollingQrToken(lessonId));
    }

    @PostMapping("/qr-checkin")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AttendanceRecord> checkInWithQr(
            @AuthenticationPrincipal User student,
            @RequestBody QrCheckInRequest request) {
        return ResponseEntity.ok(fallbackService.checkInWithQr(
                student.getId(),
                request.getQrToken(),
                request.getLatitude(),
                request.getLongitude()
        ));
    }

    @PostMapping("/manual-override")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    public ResponseEntity<AttendanceRecord> manualOverride(
            @RequestBody ManualOverrideRequest request) {
        AttendanceRecord record = attendanceRepo.findByLessonIdAndStudentId(
                request.getLessonId(), request.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Attendance record not found"));

        record.setStatus(request.getStatus());
        record.setNote(request.getNote());
        
        return ResponseEntity.ok(attendanceRepo.save(record));
    }

    @Data
    public static class QrCheckInRequest {
        private String qrToken;
        private double latitude;
        private double longitude;
    }

    @Data
    public static class ManualOverrideRequest {
        private UUID lessonId;
        private UUID studentId;
        private AttendanceStatus status;
        private String note;
    }
}
