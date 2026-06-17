package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.util.List;

/**
 * Question Bank savol yaratish/yangilash uchun request DTO.
 */
@Data
public class QuestionBankRequest {

    private String subject;          // "Mathematics", "English", etc.
    private String topic;            // "Algebra", "Grammar", etc.
    private String examCategory;     // "SAT", "IELTS", "MILLIY_SERTIFIKAT", "GENERAL"
    private String questionType;     // "mcq", "multi_select", "true_false", "ynng", "matching",
                                     // "fill_blank", "short_answer", "essay", "reading", "listening", "image_based"
    private String difficulty;       // "easy", "medium", "hard"

    private String text;             // Savol matni
    private String richContent;      // JSON formatted rich content blocks
    private String passageText;      // Reading matni
    private String audioUrl;         // Listening audio URL
    private String imageUrl;         // Rasm URL
    private String imagePosition;    // "top", "bottom", "left", "right"

    private String correctAnswer;    // Fill blank / short answer uchun
    private String explanation;      // Tushuntirish
    private Integer points;          // Ball

    private String matchingPairs;    // JSON: [{left:"...",right:"..."}]
    private String tags;             // "algebra,2024,hard"

    private List<OptionRequest> options;

    @Data
    public static class OptionRequest {
        private String text;
        private Boolean isCorrect;
        private Integer positionOrder;
        private String imageUrl;
        private String imagePosition;
    }
}
