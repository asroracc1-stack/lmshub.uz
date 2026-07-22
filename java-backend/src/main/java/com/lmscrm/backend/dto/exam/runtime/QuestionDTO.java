package com.lmscrm.backend.dto.exam.runtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * STRICTLY SECURE DTO for Runtime Examination.
 * NEVER exposes the correct answer to the frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDTO {
    
    private UUID id;
    private String text;
    private String questionType; // SingleChoice, FillBlank, Essay, etc.
    private Integer points;
    private String imageUrl;
    private String audioUrl;
    private String formulaLatex;
    
    // Only the options text/labels, NO correct flags
    private List<OptionDTO> options;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionDTO {
        private UUID id;
        private String label;
        private String text;
    }
}
