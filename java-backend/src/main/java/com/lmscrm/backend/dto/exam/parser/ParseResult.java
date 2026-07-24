package com.lmscrm.backend.dto.exam.parser;

import lombok.Data;

import java.util.*;
import java.util.stream.Collectors;

@Data
public class ParseResult {

    // ─── Exam-level metadata ──────────────────────────────────────────────────
    private String examTitle;
    private String examType;         // e.g. "IELTS_READING"
    private String subject;
    private String htmlVersion;      // e.g. "lmshub-v1"
    private Integer durationMinutes;
    private String difficulty;       // e.g. "easy", "medium", "hard"
    private String requiredPack;     // e.g. "free", "pro"
    private String audioUrl;

    // ─── Sections ─────────────────────────────────────────────────────────────
    private List<ParsedSection> sections = new ArrayList<>();

    // ─── All media assets (images, audio, etc.) ───────────────────────────────
    private List<MediaAsset> mediaAssets = new ArrayList<>();

    // ─── Convenience methods ──────────────────────────────────────────────────
    public int totalQuestionCount() {
        return sections.stream().mapToInt(s -> s.getQuestions().size()).sum();
    }

    public Map<String, Long> questionTypeBreakdown() {
        return sections.stream()
                .flatMap(s -> s.getQuestions().stream())
                .collect(Collectors.groupingBy(
                        q -> q.getQuestionType() != null ? q.getQuestionType() : "UNKNOWN",
                        Collectors.counting()
                ));
    }

    // ─── Inner classes ────────────────────────────────────────────────────────

    @Data
    public static class ParsedSection {
        private String sectionId;
        private String sectionTitle;
        private int order;
        private String passageText;
        private String passageAudioRef;    // mediaId UUID
        private String passageImageRef;    // mediaId UUID
        private String instructions;
        private Integer timeLimitSeconds;
        private List<ParsedQuestion> questions = new ArrayList<>();
    }

    @Data
    public static class ParsedQuestion {
        private String originalId;
        private String questionType;
        private String rawText;
        private String correctAnswer;
        private String explanation;
        private int order;
        private int points = 1;
        private List<ParsedOption> options = new ArrayList<>();
        private List<String> mediaRefs = new ArrayList<>();
        private Map<String, String> matchingPairs = new LinkedHashMap<>();
        private List<String> fillAnswers = new ArrayList<>();
    }

    @Data
    public static class ParsedOption {
        private String label;
        private String text;
        private boolean isCorrect;
        private String mediaRef;
    }

    @Data
    public static class MediaAsset {
        private String refId;
        private byte[] binaryData;
        private String originalName;
        private String mimeType;
        private String sha256Hash;
        private Long sizeBytes;
        private Integer width;
        private Integer height;
        private String uploadedUrl;
    }
}
