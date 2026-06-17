package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Question Bank response DTO — frontend ga yuboriladi.
 */
@Data
public class QuestionBankDto {

    private UUID id;
    private String subject;
    private String topic;
    private String examCategory;
    private String questionType;
    private String difficulty;

    private String text;
    private String richContent;
    private String passageText;
    private String audioUrl;
    private String imageUrl;
    private String imagePosition;

    private String correctAnswer;
    private String explanation;
    private Integer points;

    private String matchingPairs;
    private String tags;

    private Integer usageCount;
    private Boolean isActive;

    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<QuestionBankOptionDto> options;

    @Data
    public static class QuestionBankOptionDto {
        private UUID id;
        private String text;
        private Boolean isCorrect;
        private Integer positionOrder;
        private String imageUrl;
        private String imagePosition;
    }
}
