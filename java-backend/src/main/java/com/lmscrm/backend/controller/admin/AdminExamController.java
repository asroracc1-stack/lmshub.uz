package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.dto.exam.ExamDto;
import com.lmscrm.backend.dto.exam.QuestionDto;
import com.lmscrm.backend.dto.exam.ParseAiRequest;
import com.lmscrm.backend.dto.exam.CreateExamRequest;
import com.lmscrm.backend.service.exam.ExamService;
import com.lmscrm.backend.service.GeminiService;
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
    public ResponseEntity<ExamDto> updateExam(@PathVariable UUID examId, @RequestBody CreateExamRequest request) {
        return ResponseEntity.ok(examService.updateMockExam(examId, request));
    }

    // Admin can view questions including correct answers
    @GetMapping("/{examId}/questions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<List<QuestionDto>> getExamQuestionsForAdmin(@PathVariable UUID examId) {
        return ResponseEntity.ok(examService.getExamQuestions(examId, false));
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

    @PostMapping(value = "/analyze-pdf", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    public ResponseEntity<String> analyzePdf(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Fayl bo'sh");
            }
            if (!file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {
                return ResponseEntity.badRequest().body("Faqat PDF formatdagi fayllar qabul qilinadi");
            }
            byte[] bytes = file.getBytes();
            if (bytes.length > 20 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("PDF fayli 20MB dan kichik bo'lishi kerak");
            }
            String result = geminiService.analyzePdfMock(bytes);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            // Surface clear error messages to the frontend (e.g. missing API key, rate limit)
            String msg = e.getMessage() != null ? e.getMessage() : "Noma'lum xatolik";
            if (msg.contains("Yaroqli Gemini API kaliti") || msg.contains("GEMINI_API_KEY")) {
                return ResponseEntity.status(503).body("AI xizmati sozlanmagan: Server administratori Gemini API kalitini o'rnatishi kerak.");
            }
            return ResponseEntity.status(500).body("PDF AI tahlilida xatolik: " + msg);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("PDF AI tahlilida xatolik: " + e.getMessage());
        }
    }
}
