package com.lmscrm.backend.controller.student;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.VocabularyWord;
import com.lmscrm.backend.domain.entity.UserVocabularySettings;
import com.lmscrm.backend.service.VocabularyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vocabulary")
@RequiredArgsConstructor
@Tag(name = "Vocabulary Controller", description = "Endpoints for AI Vocabulary System")
public class VocabularyController {

    private final VocabularyService vocabularyService;

    // ─── USER READS & ROADMAP ───────────────────────────────────────────────

    @GetMapping("/words")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER', 'SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Search and filter vocabulary dictionary")
    public ResponseEntity<?> searchWords(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "level", required = false) String level,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        try {
            return ResponseEntity.ok(vocabularyService.searchWords(search, level, category, page, size));
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Unknown query error",
                "stack", sw.toString()
            ));
        }
    }

    @GetMapping("/words/unit")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER', 'SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get words for a specific unit")
    public ResponseEntity<List<VocabularyWord>> getWordsByUnit(
            @RequestParam("level") String level,
            @RequestParam("unit") Integer unit) {
        return ResponseEntity.ok(vocabularyService.getWordsByLevelAndUnit(level, unit));
    }

    @GetMapping("/roadmap")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER', 'SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get roadmap levels structure with locks and timers")
    public ResponseEntity<?> getRoadmap(
            @RequestParam("level") String level,
            @AuthenticationPrincipal User user) {
        try {
            boolean isPremium = user.getRole().name().contains("ADMIN") || 
                                user.getRole().name().contains("MANAGER") ||
                                (user.getCoins() != null && user.getCoins() > 1000);
            return ResponseEntity.ok(vocabularyService.getRoadmap(user.getId(), level, isPremium));
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Unknown roadmap error",
                "stack", sw.toString()
            ));
        }
    }

    @PostMapping("/progress")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Submit unit learning stage progress and award coins")
    public ResponseEntity<Map<String, Object>> submitProgress(
            @RequestParam("level") String level,
            @RequestParam("unit") Integer unit,
            @RequestParam("stage") Integer stage,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.submitStageProgress(user.getId(), level, unit, stage));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER', 'SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Fetch dashboard analytics charts & metrics")
    public ResponseEntity<?> getStats(@AuthenticationPrincipal User user) {
        try {
            return ResponseEntity.ok(vocabularyService.getDashboardStats(user.getId()));
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Unknown stats error",
                "stack", sw.toString()
            ));
        }
    }

    // ─── SRS REVIEWS ─────────────────────────────────────────────────────────

    @GetMapping("/reviews")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Fetch due review vocabulary words")
    public ResponseEntity<List<?>> getDueReviews(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.getDueReviews(user.getId()));
    }

    @PostMapping("/reviews/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Submit result of a review guess (correct/wrong)")
    public ResponseEntity<Map<String, Object>> submitReview(
            @RequestParam("progressId") UUID progressId,
            @RequestParam("correct") boolean correct,
            @RequestParam("difficulty") String difficulty,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.submitReviewResult(user.getId(), progressId, correct, difficulty));
    }

    @GetMapping("/weak-words")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Get current weekly weak words list")
    public ResponseEntity<?> getWeakWords(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.getWeakWords(user.getId()));
    }

    // ─── BOOKMARKS & FAVORITES ───────────────────────────────────────────────

    @PostMapping("/words/bookmark")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Toggle word bookmark status")
    public ResponseEntity<Map<String, Object>> toggleBookmark(
            @RequestParam("wordId") UUID wordId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.toggleBookmark(user.getId(), wordId));
    }

    @PostMapping("/words/favorite")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Toggle word favorite status")
    public ResponseEntity<Map<String, Object>> toggleFavorite(
            @RequestParam("wordId") UUID wordId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.toggleFavorite(user.getId(), wordId));
    }

    @GetMapping("/bookmarks")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Get list of user bookmarks")
    public ResponseEntity<?> getBookmarks(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.getBookmarks(user.getId()));
    }

    // ─── SETTINGS & GOALS ────────────────────────────────────────────────────

    @GetMapping("/settings")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    public ResponseEntity<UserVocabularySettings> getSettings(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.getOrCreateSettings(user.getId()));
    }

    @PostMapping("/settings/goal")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Set daily words count target")
    public ResponseEntity<UserVocabularySettings> updateGoal(
            @RequestParam("goal") Integer goal,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.updateDailyGoal(user.getId(), goal));
    }

    @PostMapping("/claim-chest")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Claim daily/weekly/monthly gamified chest rewards")
    public ResponseEntity<Map<String, Object>> claimChest(
            @RequestParam("chestType") String chestType,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.claimChest(user.getId(), chestType));
    }

    // ─── AI INTEGRATIONS (GEMINI) ───────────────────────────────────────────

    @PostMapping("/ai/generate-word-data")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Auto-complete complete lexicographical details for a word via Gemini AI")
    public ResponseEntity<Map<String, Object>> generateWordData(
            @RequestParam("word") String word,
            @RequestParam("level") String level) {
        return ResponseEntity.ok(vocabularyService.generateWordDataAI(word, level));
    }

    @PostMapping("/ai/pronounce-check")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Detailed AI speech phonetics verification check")
    public ResponseEntity<Map<String, Object>> evaluateSpeech(
            @RequestParam("wordId") UUID wordId,
            @RequestParam("transcription") String transcription,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vocabularyService.evaluateSpeech(user.getId(), wordId, transcription));
    }

    // ─── ADMIN BULK EXPORTS/IMPORTS ──────────────────────────────────────────

    @GetMapping("/admin/export")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Export all words to CSV format")
    public ResponseEntity<byte[]> exportCsv() {
        byte[] csv = vocabularyService.exportCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"vocabulary_export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @PostMapping("/admin/import")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Import dictionary from CSV file")
    public ResponseEntity<?> importCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "level", required = false) String forcedLevel) {
        try {
            vocabularyService.importCsv(file, forcedLevel);
            return ResponseEntity.ok(Map.of("success", true, "message", "Dictionary imported successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/admin/words")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Create vocabulary word record manually")
    public ResponseEntity<?> createWord(@RequestBody VocabularyWord word) {
        try {
            return ResponseEntity.ok(vocabularyService.createWord(word));
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Unknown creation error",
                "stack", sw.toString()
            ));
        }
    }

    @PutMapping("/admin/words/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Update vocabulary word record manually")
    public ResponseEntity<?> updateWord(
            @PathVariable("id") UUID id,
            @RequestBody VocabularyWord word) {
        try {
            return ResponseEntity.ok(vocabularyService.updateWord(id, word));
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Unknown update error",
                "stack", sw.toString()
            ));
        }
    }

    @DeleteMapping("/admin/words/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Delete vocabulary word")
    public ResponseEntity<?> deleteWord(@PathVariable("id") UUID id) {
        try {
            vocabularyService.deleteWord(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Word deleted"));
        } catch (Exception e) {
            e.printStackTrace();
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Unknown deletion error",
                "stack", sw.toString()
            ));
        }
    }
}
