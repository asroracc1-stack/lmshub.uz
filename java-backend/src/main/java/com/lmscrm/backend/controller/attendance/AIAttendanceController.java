package com.lmscrm.backend.controller.attendance;

import com.lmscrm.backend.domain.entity.AttendanceRecord;
import com.lmscrm.backend.domain.entity.CameraDevice;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.AttendanceRecordRepository;
import com.lmscrm.backend.repository.CameraDeviceRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.domain.enums.AppRole;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
public class AIAttendanceController {

    private final AttendanceRecordRepository recordRepo;
    private final CameraDeviceRepository cameraRepo;
    private final UserRepository userRepo;

    @GetMapping("/unknowns")
    public ResponseEntity<List<UnknownDetectionDto>> getUnknownDetections(@AuthenticationPrincipal User user) {
        // Return a mock/simulation database of unrecognized faces for the organization
        List<UnknownDetectionDto> list = new ArrayList<>();
        list.add(UnknownDetectionDto.builder()
                .id("unk-101")
                .detectedAt("12:24:05 PM")
                .cameraName("Main Entrance")
                .room("Foyer Hall")
                .confidence(54.2)
                .build());
        list.add(UnknownDetectionDto.builder()
                .id("unk-102")
                .detectedAt("12:15:30 PM")
                .cameraName("Library Corridor")
                .room("Library 2F")
                .confidence(42.8)
                .build());
        list.add(UnknownDetectionDto.builder()
                .id("unk-103")
                .detectedAt("11:58:12 AM")
                .cameraName("Physics Lab South")
                .room("Lab 108")
                .confidence(38.5)
                .build());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/unknowns/{id}/action")
    public ResponseEntity<Void> processUnknownAction(
            @PathVariable String id,
            @RequestParam String action) {
        // Log auditing security action on unrecognized subject
        System.out.println("Alert " + id + " flagged as: " + action);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/security-logs")
    public ResponseEntity<List<SecurityLogDto>> getSecurityLogs(@AuthenticationPrincipal User user) {
        List<SecurityLogDto> logs = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        logs.add(SecurityLogDto.builder()
                .id("log-901")
                .timestamp(now.minusMinutes(5).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .type("SPOOF_ATTEMPT")
                .severity("CRITICAL")
                .message("Photo replay attack detected at Main Entrance. Liveness check failed.")
                .build());
        logs.add(SecurityLogDto.builder()
                .id("log-902")
                .timestamp(now.minusMinutes(12).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .type("CAMERA_DISCONNECTED")
                .severity("WARNING")
                .message("Camera 'Physics Lab South' disconnected. Checking ping latency...")
                .build());
        logs.add(SecurityLogDto.builder()
                .id("log-903")
                .timestamp(now.minusMinutes(45).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .type("DEEPFAKE_FLAG")
                .severity("CRITICAL")
                .message("DeepFake pattern detected on face scan in Library corridor.")
                .build());
        logs.add(SecurityLogDto.builder()
                .id("log-904")
                .timestamp(now.minusHours(2).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .type("UNAUTHORIZED_ACCESS")
                .severity("INFO")
                .message("Unregistered visitor detected in Administration Wing.")
                .build());
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AttendanceRecordDto>> getAttendanceLogs(@AuthenticationPrincipal User user) {
        UUID orgId = user.getOrganizationId();
        List<User> students = userRepo.findByRoleAndOrganizationId(AppRole.STUDENT, orgId);
        if (students.isEmpty()) {
            students = userRepo.findByRole(AppRole.STUDENT);
        }
        if (students.isEmpty()) {
            students = userRepo.findAll();
        }

        List<AttendanceRecordDto> dtos = new ArrayList<>();
        int count = 1;
        for (User student : students) {
            String fullName = student.getFullName() != null && !student.getFullName().trim().isEmpty()
                    ? student.getFullName() 
                    : student.getUsername();

            // Exclude super admins if we fell back to findAll and have enough users
            if (student.getRole() == AppRole.SUPER_ADMIN && students.size() > 3) {
                continue;
            }

            String code = "LMS-" + student.getId().toString().substring(0, 5).toUpperCase();
            String arrivalTime = (count % 4 == 0) ? "09:08 AM" : (count % 6 == 0) ? "—" : "08:58 AM";
            String status = (count % 4 == 0) ? "LATE" : (count % 6 == 0) ? "ABSENT" : "PRESENT";
            int rate = (count % 4 == 0) ? 92 : (count % 6 == 0) ? 0 : 98;

            dtos.add(AttendanceRecordDto.builder()
                    .id("att-" + student.getId())
                    .studentName(fullName)
                    .studentId(code)
                    .faculty(student.getSubject() != null ? student.getSubject() : "IELTS Course")
                    .groupName("SAT Group A")
                    .room("Room 101")
                    .arrivalTime(arrivalTime)
                    .status(status)
                    .presenceRate(rate)
                    .build());
            count++;
        }
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/mobile-pairing")
    public ResponseEntity<PairingDto> generatePairingToken() {
        return ResponseEntity.ok(PairingDto.builder()
                .qrToken("lmshub-paired-stream-token-" + UUID.randomUUID())
                .expiresAt(LocalDateTime.now().plusMinutes(15).toString())
                .build());
    }

    @Data
    @Builder
    public static class UnknownDetectionDto {
        private String id;
        private String detectedAt;
        private String cameraName;
        private String room;
        private double confidence;
    }

    @Data
    @Builder
    public static class SecurityLogDto {
        private String id;
        private String timestamp;
        private String type;
        private String severity;
        private String message;
    }

    @Data
    @Builder
    public static class AttendanceRecordDto {
        private String id;
        private String studentName;
        private String studentId;
        private String faculty;
        private String groupName;
        private String room;
        private String arrivalTime;
        private String status;
        private int presenceRate;
    }

    @Data
    @Builder
    public static class PairingDto {
        private String qrToken;
        private String expiresAt;
    }
}
