package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.exam.QuestionBankDto;
import com.lmscrm.backend.dto.exam.QuestionBankRequest;
import com.lmscrm.backend.service.exam.QuestionBankService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/super-admin/question-bank")
@RequiredArgsConstructor
@Tag(name = "Question Bank", description = "Super Admin Question Bank CRUD")
public class QuestionBankController {

    private final QuestionBankService questionBankService;

    // ─── GET: Barcha savollar (filter + pagination) ─────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Savollar bankini olish (filter bilan)")
    public ResponseEntity<Page<QuestionBankDto>> getQuestions(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String examCategory,
            @RequestParam(required = false) String questionType,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(questionBankService.getQuestions(
                subject, topic, examCategory, questionType, difficulty, search, page, size
        ));
    }

    // ─── GET: Bitta savol ────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Bitta savol ma'lumotini olish")
    public ResponseEntity<QuestionBankDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(questionBankService.getById(id));
    }

    // ─── POST: Savol yaratish ─────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Yangi savol yaratish")
    public ResponseEntity<QuestionBankDto> create(
            @RequestBody QuestionBankRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(questionBankService.create(request, user));
    }

    // ─── PUT: Savol yangilash ─────────────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Savol ma'lumotlarini yangilash")
    public ResponseEntity<QuestionBankDto> update(
            @PathVariable UUID id,
            @RequestBody QuestionBankRequest request
    ) {
        return ResponseEntity.ok(questionBankService.update(id, request));
    }

    // ─── DELETE: Savol o'chirish (soft) ──────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Savolni o'chirish (soft delete — isActive=false)")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        questionBankService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── DELETE: Hard delete ──────────────────────────────────────────────────────
    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Savolni butunlay o'chirish (hard delete — DB dan)")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID id) {
        questionBankService.hardDelete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── GET: Statistika ─────────────────────────────────────────────────────────
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Question Bank statistikasi")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(questionBankService.getStats());
    }

    // ─── GET: Fanlar ro'yxati ─────────────────────────────────────────────────────
    @GetMapping("/subjects")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Mavjud fanlar ro'yxati")
    public ResponseEntity<List<String>> getSubjects() {
        return ResponseEntity.ok(questionBankService.getSubjects());
    }

    // ─── GET: Mavzular (fan bo'yicha) ─────────────────────────────────────────────
    @GetMapping("/topics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Fan bo'yicha mavzular ro'yxati")
    public ResponseEntity<List<String>> getTopics(@RequestParam String subject) {
        return ResponseEntity.ok(questionBankService.getTopics(subject));
    }
}
