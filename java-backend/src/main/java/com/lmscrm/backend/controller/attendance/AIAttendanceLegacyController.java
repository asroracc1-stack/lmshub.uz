package com.lmscrm.backend.controller.attendance;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AIAttendanceLegacyController {

    @PostMapping("/cameras/pair")
    public ResponseEntity<PairResponse> pairCamera(@RequestBody PairRequest request) {
        System.out.println("Pairing mobile camera: " + request.getCameraName() + " with token: " + request.getToken());
        return ResponseEntity.ok(PairResponse.builder()
                .status("PAIRED")
                .deviceId(UUID.randomUUID().toString())
                .message("Device paired successfully to room " + request.getRoomNumber())
                .build());
    }

    @PostMapping("/cameras/connect")
    public ResponseEntity<ConnectResponse> connectCamera(@RequestBody ConnectRequest request) {
        System.out.println("Connecting camera WebRTC tunnel: " + request.getDeviceId());
        return ResponseEntity.ok(ConnectResponse.builder()
                .status("CONNECTED")
                .signalingUrl("ws://localhost:8080/webrtc/signaling")
                .build());
    }

    @PostMapping("/attendance/mark")
    public ResponseEntity<AttendanceMarkResponse> markAttendance(@RequestBody AttendanceMarkRequest request) {
        System.out.println("Marking attendance for student: " + request.getStudentId() + " -> " + request.getStatus());
        return ResponseEntity.ok(AttendanceMarkResponse.builder()
                .status("MARKED")
                .studentId(request.getStudentId())
                .calculatedStatus(request.getStatus())
                .build());
    }

    @PostMapping("/faces/enroll")
    public ResponseEntity<EnrollResponse> enrollFace(@RequestBody EnrollRequest request) {
        System.out.println("Enrolling Face ID for student: " + request.getStudentId());
        return ResponseEntity.ok(EnrollResponse.builder()
                .status("ENROLLED")
                .studentId(request.getStudentId())
                .vectorSize(512)
                .build());
    }

    @PostMapping("/faces/verify")
    public ResponseEntity<VerifyResponse> verifyFace(@RequestBody VerifyRequest request) {
        System.out.println("Verifying Face ID embedding...");
        double similarity = 0.96; // Simulated match
        String calculatedStatus = similarity >= 0.95 ? "PRESENT" : similarity >= 0.90 ? "VERIFY" : "UNKNOWN";
        
        return ResponseEntity.ok(VerifyResponse.builder()
                .matched(similarity >= 0.95)
                .studentId(UUID.randomUUID().toString())
                .similarity(similarity)
                .statusDecision(calculatedStatus)
                .build());
    }

    @Data
    public static class PairRequest {
        private String token;
        private String cameraName;
        private String roomNumber;
    }

    @Data
    @Builder
    public static class PairResponse {
        private String status;
        private String deviceId;
        private String message;
    }

    @Data
    public static class ConnectRequest {
        private String deviceId;
        private String sdpOffer;
    }

    @Data
    @Builder
    public static class ConnectResponse {
        private String status;
        private String signalingUrl;
        private String sdpAnswer;
    }

    @Data
    public static class AttendanceMarkRequest {
        private String studentId;
        private String status;
        private String lessonId;
    }

    @Data
    @Builder
    public static class AttendanceMarkResponse {
        private String status;
        private String studentId;
        private String calculatedStatus;
    }

    @Data
    public static class EnrollRequest {
        private String studentId;
        private byte[] imageBytes;
        private float[] embeddingVector;
        private String modelVersion;
    }

    @Data
    @Builder
    public static class EnrollResponse {
        private String status;
        private String studentId;
        private int vectorSize;
    }

    @Data
    public static class VerifyRequest {
        private float[] embeddingVector;
        private byte[] imageBytes;
    }

    @Data
    @Builder
    public static class VerifyResponse {
        private boolean matched;
        private String studentId;
        private double similarity;
        private String statusDecision;
    }
}
