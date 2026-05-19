package com.lmscrm.backend.controller;

import com.lmscrm.backend.service.GeminiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "AI Controller", description = "Endpoints for AI generations using Gemini")
public class AiController {

    private final GeminiService geminiService;

    @PostMapping("/generate-subject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Generate details for a new subject using Gemini AI")
    public ResponseEntity<String> generateSubject(@RequestParam String name) {
        String prompt = "Men '" + name + "' degan yangi fan yaratyapman. " +
                "Menga shu fanning 3-4 harfli kodini (code) (masalan matematika uchun MATH, ingliz tili uchun ENGL), " +
                "fanning qisqacha o'zbek tilidagi tavsifini (description) (1-2 gapdan iborat mazmunli ta'rif) va " +
                "fanga mos keladigan eng mos rang mavzusini (primary, secondary, accent, success, warning, destructive) " +
                "faqat JSON formatda qaytar. " +
                "Hech qanday markdown formatsiz (ya'ni ```json so'zlarisiz), faqat raw JSON matn bo'lsin: " +
                "{\"code\": \"...\", \"description\": \"...\", \"color\": \"...\"}";

        String response = geminiService.executeWithRotation(prompt, 3);
        return ResponseEntity.ok(response);
    }
}
