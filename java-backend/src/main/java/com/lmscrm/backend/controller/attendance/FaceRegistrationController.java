package com.lmscrm.backend.controller.attendance;

import com.lmscrm.backend.domain.entity.FaceEmbedding;
import com.lmscrm.backend.service.ai.FaceRegistrationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/face-registration")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
public class FaceRegistrationController {

    private final FaceRegistrationService registrationService;

    @PostMapping("/validate-quality")
    public ResponseEntity<FaceRegistrationService.FaceQualityReport> validateQuality(
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(registrationService.validateFaceQuality(file.getBytes()));
    }

    @PostMapping("/check-duplicate")
    public ResponseEntity<Boolean> checkDuplicate(
            @RequestParam("organizationId") UUID orgId,
            @RequestParam("modelVersion") String modelVersion,
            @RequestBody float[] embeddingVector) {
        return ResponseEntity.ok(registrationService.checkDuplicateEmbedding(embeddingVector, orgId, modelVersion));
    }

    @PostMapping("/register")
    public ResponseEntity<FaceEmbedding> registerFace(
            @RequestBody RegisterFaceRequest request) {
        return ResponseEntity.ok(registrationService.registerFace(
                request.getStudentId(),
                request.getImageBytes(),
                request.getEmbeddingVector(),
                request.getModelVersion()
        ));
    }

    @Data
    public static class RegisterFaceRequest {
        private UUID studentId;
        private byte[] imageBytes;
        private float[] embeddingVector;
        private String modelVersion;
    }
}
