package com.lmscrm.backend.controller.library;

import com.lmscrm.backend.domain.entity.LibraryCategory;
import com.lmscrm.backend.domain.entity.LibraryMaterial;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.library.LibraryMaterialDto;
import com.lmscrm.backend.dto.library.LibraryMaterialRequest;
import com.lmscrm.backend.dto.library.LibraryProgressRequest;
import com.lmscrm.backend.dto.library.LibraryStatsDto;
import com.lmscrm.backend.repository.LibraryMaterialRepository;
import com.lmscrm.backend.service.library.LibraryService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/library")
@RequiredArgsConstructor
@Tag(name = "Kutubxona", description = "Endpoints for LMSHub Digital Library module")
public class LibraryController {

    private final LibraryService libraryService;
    private final LibraryMaterialRepository materialRepository;

    // ─── CATEGORIES ─────────────────────────────────────────────────────────────
    @GetMapping("/categories")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kategoriyalar ro'yxatini olish")
    public ResponseEntity<List<LibraryCategory>> getCategories() {
        return ResponseEntity.ok(libraryService.getCategories());
    }

    @GetMapping("/categories/{code}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kategoriyani kod bo'yicha olish")
    public ResponseEntity<LibraryCategory> getCategoryByCode(@PathVariable String code) {
        return ResponseEntity.ok(libraryService.getCategoryByCode(code));
    }

    // ─── MATERIALS CRUD ─────────────────────────────────────────────────────────
    @GetMapping("/materials")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kutubxona materiallarini filtrlab olish (pagination)")
    public ResponseEntity<Page<LibraryMaterialDto>> getMaterials(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String accessType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(libraryService.getMaterials(
                categoryId, subject, grade, accessType, status, search, page, size, user
        ));
    }

    @GetMapping("/materials/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Material tafsilotlarini olish (ko'rishlar sonini oshiradi)")
    public ResponseEntity<LibraryMaterialDto> getMaterialById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(libraryService.getMaterialById(id, user));
    }

    @PostMapping("/materials")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Yangi material yaratish")
    public ResponseEntity<LibraryMaterialDto> createMaterial(
            @RequestBody @Valid LibraryMaterialRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(libraryService.createMaterial(request, user));
    }

    @PutMapping("/materials/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Materialni yangilash")
    public ResponseEntity<LibraryMaterialDto> updateMaterial(
            @PathVariable UUID id,
            @RequestBody @Valid LibraryMaterialRequest request
    ) {
        return ResponseEntity.ok(libraryService.updateMaterial(id, request));
    }

    @DeleteMapping("/materials/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Materialni o'chirish")
    public ResponseEntity<Void> deleteMaterial(@PathVariable UUID id) {
        libraryService.deleteMaterial(id);
        return ResponseEntity.noContent().build();
    }

    // ─── FAVORITES ──────────────────────────────────────────────────────────────
    @PostMapping("/materials/{id}/favorite")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Materialni sevimlilarga qo'shish yoki olib tashlash")
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        boolean isFavorite = libraryService.toggleFavorite(id, user);
        return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
    }

    @GetMapping("/favorites")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Foydalanuvchining sevimlilar ro'yxatini olish")
    public ResponseEntity<List<LibraryMaterialDto>> getFavorites(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(libraryService.getFavorites(user));
    }

    // ─── READING PROGRESS ───────────────────────────────────────────────────────
    @PostMapping("/materials/{id}/progress")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'qish progressini saqlash")
    public ResponseEntity<Void> saveProgress(
            @PathVariable UUID id,
            @RequestBody @Valid LibraryProgressRequest request,
            @AuthenticationPrincipal User user
    ) {
        libraryService.saveProgress(id, request.getLastPage(), user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/materials/{id}/progress")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'qish progressini olish")
    public ResponseEntity<Map<String, Integer>> getProgress(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        int page = libraryService.getProgress(id, user);
        return ResponseEntity.ok(Map.of("lastPage", page));
    }

    // ─── DOWNLOAD AUDIT ─────────────────────────────────────────────────────────
    @PostMapping("/materials/{id}/download")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Yuklab olishni qayd etish")
    public ResponseEntity<Void> recordDownload(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        libraryService.recordDownload(id, user);
        return ResponseEntity.ok().build();
    }

    // ─── SECURE PDF STREAMING ───────────────────────────────────────────────────
    @GetMapping("/materials/{id}/pdf-stream")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Ruxsat etilgan foydalanuvchiga PDF-ni xavfsiz oqim shaklida taqdim etish")
    public ResponseEntity<byte[]> streamPdf(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        LibraryMaterial material = materialRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Material topilmadi"));

        if (!libraryService.hasAccess(material, user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String pdfUrl = material.getPdfUrl();
        if (pdfUrl == null || pdfUrl.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String filename = pdfUrl.substring(pdfUrl.lastIndexOf("/") + 1);
        try {
            filename = java.net.URLDecoder.decode(filename, java.nio.charset.StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            // fallback if decode fails
        }

        try {
            Path file = Paths.get("uploads/").resolve(filename);
            if (!Files.exists(file)) {
                // Try checking inside java-backend directory
                file = Paths.get("java-backend/uploads/").resolve(filename);
                if (!Files.exists(file)) {
                    return ResponseEntity.notFound().build();
                }
            }
            byte[] data = Files.readAllBytes(file);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header("Content-Disposition", "inline; filename=\"" + filename + "\"")
                    .body(data);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ─── STATISTICS ─────────────────────────────────────────────────────────────
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Kutubxona statistikalarini olish")
    public ResponseEntity<LibraryStatsDto> getStatistics() {
        return ResponseEntity.ok(libraryService.getStatistics());
    }

    // ─── SUBJECTS & GRADES ───────────────────────────────────────────────────────
    @GetMapping("/subjects")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mavjud fanlarni olish")
    public ResponseEntity<List<String>> getSubjects() {
        return ResponseEntity.ok(libraryService.getSubjects());
    }

    @GetMapping("/grades")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mavjud sinflarni olish")
    public ResponseEntity<List<String>> getGrades() {
        return ResponseEntity.ok(libraryService.getGrades());
    }
}
