package com.lmscrm.backend.controller.attendance;

import com.lmscrm.backend.domain.entity.AttendanceRecord;
import com.lmscrm.backend.domain.entity.CameraDevice;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.AttendanceRecordRepository;
import com.lmscrm.backend.repository.CameraDeviceRepository;
import com.lmscrm.backend.repository.UserRepository;
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
        // Query database records for the student attendance
        UUID orgId = user.getOrganizationId();
        List<AttendanceRecord> records = recordRepo.findByOrganizationId(orgId);
        
        List<AttendanceRecordDto> dtos = records.stream().map(r -> AttendanceRecordDto.builder()
                .id(r.getId().toString())
                .studentName(r.getStudent().getFullName() != null ? r.getStudent().getFullName() : r.getStudent().getUsername())
                .studentId("LMS-" + r.getStudent().getId().toString().substring(0, 5).toUpperCase())
                .faculty(r.getStudent().getSubject() != null ? r.getStudent().getSubject() : "IELTS Hub")
                .groupName(r.getLesson() != null && r.getLesson().getGroup() != null ? r.getLesson().getGroup().getName() : "General")
                .room(r.getClassroom() != null ? r.getClassroom().getName() : "Room 101")
                .arrivalTime(r.getCheckInTime() != null ? r.getCheckInTime().format(DateTimeFormatter.ofPattern("hh:mm a")) : "—")
                .status(r.getStatus() != null ? r.getStatus().name() : "ABSENT")
                .presenceRate(r.getAiConfidenceScore() != null ? (int)(r.getAiConfidenceScore().doubleValue() * 100) : 95)
                .build())
                .collect(Collectors.toList());

        // Fill with mock data if database is empty for demo/correct load
        if (dtos.isEmpty()) {
            dtos.add(AttendanceRecordDto.builder().id("att-1").studentName("Jasur Akhmedov").studentId("LMS-10829").faculty("Computer Science").groupName("CS-204").room("Auditorium 102").arrivalTime("08:32 AM").status("PRESENT").presenceRate(98).build());
            dtos.add(AttendanceRecordDto.builder().id("att-2").studentName("Madina Tursunova").studentId("LMS-10842").faculty("Computer Science").groupName("CS-204").room("Auditorium 102").arrivalTime("08:35 AM").status("PRESENT").presenceRate(99).build());
            dtos.add(AttendanceRecordDto.builder().id("att-3").studentName("Diyorbek Sadullayev").studentId("LMS-10901").faculty("Computer Science").groupName("CS-204").room("Auditorium 102").arrivalTime("08:41 AM").status("PRESENT").presenceRate(95).build());
            dtos.add(AttendanceRecordDto.builder().id("att-4").studentName("Sardor Oripov").studentId("LMS-10421").faculty("Computer Science").groupName("CS-202").room("Lab 305").arrivalTime("08:52 AM").status("LATE").presenceRate(88).build());
            dtos.add(AttendanceRecordDto.builder().id("att-5").studentName("Kamola Bekmirzayeva").studentId("LMS-10332").faculty("Languages").groupName("ENG-101").room("Library 2F").arrivalTime("08:44 AM").status("PRESENT").presenceRate(96).build());
            dtos.add(AttendanceRecordDto.builder().id("att-6").studentName("Rayhon Qodirova").studentId("LMS-10291").faculty("Computer Science").groupName("CS-202").room("Lab 305").arrivalTime("—").status("ABSENT").presenceRate(74).build());
            dtos.add(AttendanceRecordDto.builder().id("att-7").studentName("Bobur Karimov").studentId("LMS-10512").faculty("Computer Science").groupName("CS-204").room("Auditorium 102").arrivalTime("08:31 AM").status("PRESENT").presenceRate(92).build());
            dtos.add(AttendanceRecordDto.builder().id("att-8").studentName("Aziza Vahobova").studentId("LMS-10641").faculty("Languages").groupName("ENG-101").room("Library 2F").arrivalTime("09:05 AM").status("LATE").presenceRate(81).build());
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
