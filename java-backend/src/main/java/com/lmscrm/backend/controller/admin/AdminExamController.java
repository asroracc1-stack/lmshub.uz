package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.dto.exam.ExamDto;
import com.lmscrm.backend.dto.exam.QuestionDto;
import com.lmscrm.backend.dto.exam.ParseAiRequest;
import com.lmscrm.backend.dto.exam.CreateExamRequest;
import com.lmscrm.backend.service.exam.ExamService;
import com.lmscrm.backend.service.GeminiService;
import com.lmscrm.backend.service.exam.parser.ImportOrchestrator;
import com.lmscrm.backend.domain.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/exams")
@RequiredArgsConstructor
public class AdminExamController {

    private final ExamService examService;
    private final GeminiService geminiService;
    private final ImportOrchestrator importOrchestrator;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<ExamDto> createExam(@RequestBody CreateExamRequest request, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.createMockExam(request, user));
    }

    @PostMapping(value = "/parse-ai", consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<String> parseAiMockJson(@RequestBody ParseAiRequest request) {
        try {
            return ResponseEntity.ok(geminiService.analyzeIeltsMockWithImages(request.getText(), new java.util.ArrayList<>()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("AI tahlilida xatolik: " + e.getMessage());
        }
    }

    @PostMapping(value = "/parse-ai", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<String> parseAiMock(
            @RequestParam("text") String text,
            @RequestPart(value = "images", required = false) List<org.springframework.web.multipart.MultipartFile> images) {
        
        List<String> imageUrls = new java.util.ArrayList<>();
        try {
            if (images != null) {
                String uploadDir = "uploads";
                java.nio.file.Path root = java.nio.file.Paths.get(uploadDir).toAbsolutePath();
                if (!java.nio.file.Files.exists(root)) {
                    java.nio.file.Files.createDirectories(root);
                }
                for (org.springframework.web.multipart.MultipartFile file : images) {
                    if (!file.isEmpty()) {
                        String filename = java.util.UUID.randomUUID() + "-" + file.getOriginalFilename();
                        java.nio.file.Files.copy(file.getInputStream(), root.resolve(filename));
                        imageUrls.add("/api/v1/files/view/" + filename);
                    }
                }
            }
            return ResponseEntity.ok(geminiService.analyzeIeltsMockWithImages(text, imageUrls));
        } catch (Exception e) {
            e.printStackTrace(); // Log the error for debugging
            return ResponseEntity.status(500).body("AI tahlilida xatolik: " + e.getMessage());
        }
    }

    @PostMapping("/analyze-writing")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT')")
    public ResponseEntity<String> analyzeWriting(@RequestBody ParseAiRequest request) {
        return ResponseEntity.ok(geminiService.analyzeIeltsWriting(request.getText(), "IELTS Task"));
    }

    // Exam player — ID bo'yicha to'liq exam (passages + questions + options)
    @GetMapping("/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'USER')")
    public ResponseEntity<ExamDto> getExamById(@PathVariable UUID examId) {
        return ResponseEntity.ok(examService.getExamDetails(examId));
    }

    @PutMapping("/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<ExamDto> updateExam(@PathVariable UUID examId, @RequestBody CreateExamRequest request, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.updateMockExam(examId, request, user));
    }

    // Admin can view questions including correct answers
    @GetMapping("/{examId}/questions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<List<QuestionDto>> getExamQuestionsForAdmin(@PathVariable UUID examId) {
        return ResponseEntity.ok(examService.getExamQuestions(examId, null, false));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'USER')")
    public ResponseEntity<List<ExamDto>> getExams(@RequestParam(value = "type", required = false) String type) {
        if (type == null || type.trim().isEmpty()) {
            return ResponseEntity.ok(examService.getAllExams());
        }
        return ResponseEntity.ok(examService.getExamsByType(type));
    }

    @DeleteMapping("/{examId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<Void> deleteExam(@PathVariable UUID examId) {
        examService.deleteExam(examId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/import-preview", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<?> importPreview(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Fayl bo'sh");
            }
            
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";

            byte[] bytes = file.getBytes();
            if (bytes.length > 20 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("Hujjat 20MB dan kichik bo'lishi kerak");
            }

            com.lmscrm.backend.dto.exam.parser.PreviewResponse response =
                    importOrchestrator.previewImport(bytes, fileName);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Import tizimida xatolik: " + e.getMessage());
        }
    }

    @PostMapping(value = "/import-commit", consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<?> importCommit(@RequestBody java.util.Map<String, String> body,
                                          @AuthenticationPrincipal User user) {
        try {
            String importSessionId = body.get("importSessionId");
            if (importSessionId == null || importSessionId.isBlank()) {
                return ResponseEntity.badRequest().body("importSessionId talab qilinadi");
            }
            com.lmscrm.backend.dto.exam.parser.CommitResponse response =
                    importOrchestrator.commitImport(importSessionId, user);
            return ResponseEntity.ok(response);

        } catch (com.lmscrm.backend.exception.SessionExpiredException e) {
            return ResponseEntity.status(410).body("Sessiya muddati tugagan. Faylni qayta yuklang.");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Import tizimida xatolik: " + e.getMessage());
        }
    }

    @PostMapping("/{examId}/duplicate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<ExamDto> duplicateExam(@PathVariable UUID examId, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.duplicateExam(examId, user));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<java.util.Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(examService.getMockAnalytics());
    }

    @PostMapping("/bulk-publish")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<Void> bulkPublish(@RequestBody List<UUID> ids, @AuthenticationPrincipal User user) {
        examService.bulkPublish(ids, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-archive")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<Void> bulkArchive(@RequestBody List<UUID> ids) {
        examService.bulkArchive(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<Void> bulkDelete(@RequestBody List<UUID> ids) {
        examService.bulkDelete(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-duplicate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<List<ExamDto>> bulkDuplicate(@RequestBody List<UUID> ids, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.bulkDuplicate(ids, user));
    }

    @PostMapping("/bulk-export")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<byte[]> bulkExport(@RequestBody List<UUID> ids) throws Exception {
        byte[] zipBytes = examService.bulkExport(ids);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"exams_export.zip\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(zipBytes);
    }

    @PostMapping(value = "/import-zip", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @CacheEvict(cacheNames = {"examDetails", "examsByType"}, allEntries = true)
    public ResponseEntity<ExamDto> importZip(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal User user) throws Exception {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("ZIP fayl bo'sh");
        }
        if (!file.getOriginalFilename().toLowerCase().endsWith(".zip")) {
            throw new IllegalArgumentException("Faqat ZIP formatdagi fayllar qabul qilinadi");
        }
        return ResponseEntity.ok(examService.importExamZip(file, user));
    }

    @PostMapping("/import-url")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<String> importUrl(@RequestBody java.util.Map<String, String> payload) {
        String url = payload.get("url");
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("URL kiritilishi shart");
        }
        return ResponseEntity.ok(examService.extractMockFromUrl(url));
    }
}

