package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.util.List;

@Data
public class CreateExamRequest {
    private String title;
    private String description;
    private String type; // READING, LISTENING, WRITING, SPEAKING, etc.
    private Integer durationMinutes;
    private Integer passingScore;
    private String difficulty; // easy, medium, hard
    private String audioUrl;
    private String requiredPack;
    private List<SectionDto> sections;
    
    @Data
    public static class SectionDto {
        private String title;
        private String passage;
        private String imageUrl;
        private List<QuestionDto> questions;
    }
    
    @Data
    public static class QuestionDto {
        private String prompt;
        private String qtype;
        private List<OptionDto> options;
        private Integer points;
        private String explanation;
        private String imageUrl;
        private String imagePosition;
    }

    @Data
    public static class OptionDto {
        private String text;
        private Boolean isCorrect;
        private String imageUrl;
        private String imagePosition;
    }
}
