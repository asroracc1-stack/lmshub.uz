package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.util.List;

@Data
public class CreateExamRequest {
    // === Exam Level ===
    private String title;
    private String description;
    private String type;            // READING, LISTENING, WRITING, SAT, NATIONAL_CERT, CEFR, CUSTOM...
    private Integer durationMinutes;
    private Integer passingScore;
    private String difficulty;      // easy, medium, hard, expert
    private String audioUrl;
    private String requiredPack;
    private String pdfUrl;
    private Boolean isPublished;
    private String tags;            // comma-separated
    private List<SectionDto> sections;

    @Data
    public static class SectionDto {
        // === Section Level ===
        private String title;
        private String passage;
        private String imageUrl;
        private String audioUrl;            // section-level intro audio
        private String pdfAttachment;       // PDF reference URL
        private Integer timeLimitSeconds;   // per-section time limit
        private Boolean shuffleQuestions;
        private Boolean shuffleOptions;
        private Boolean autoNumbering;
        private Boolean lockNavigation;
        private Boolean questionRandomization;
        private String instructions;
        private String colorTheme;
        private String icon;
        private String difficulty;
        private Integer passingScore;
        private List<QuestionDto> questions;
    }

    @Data
    public static class QuestionDto {
        // === Question Level ===
        private String prompt;
        private String qtype;
        private List<OptionDto> options;
        private Integer points;
        private Double negativeMarks;
        private Integer timeLimitSeconds;
        private String explanation;
        private String imageUrl;
        private String imagePosition;
        private String audioUrl;        // question-level audio
        private String videoUrl;        // question-level video
        private String formulaLatex;    // LaTeX formula
        private String matchingPairs;   // JSON string for matching/ordering
        private String hint;
        private String topic;
        private String subtopic;
        private String tags;            // comma-separated
        private String difficulty;
        private Double numericAnswer;
        private Double numericTolerance;
        private String fillTemplate;    // Fill-in-the-blank template
        private Integer wordLimit;      // Essay word limit
    }

    @Data
    public static class OptionDto {
        private String text;
        private Boolean isCorrect;
        private String imageUrl;
        private String imagePosition;
        private String formula;         // LaTeX for option
        private String explanation;     // per-option explanation
        private Double weight;          // partial scoring weight
    }
}

