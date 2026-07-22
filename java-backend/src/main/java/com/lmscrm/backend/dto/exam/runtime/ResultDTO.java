package com.lmscrm.backend.dto.exam.runtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * The premium IELTS/SAT CBT style Results Page DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResultDTO {

    private String examTitle;
    private String studentName;
    
    // Top level metrics
    private Double bandScore; // e.g. 7.5 for IELTS, 1450 for SAT
    private Integer totalQuestions;
    private Integer correctCount;
    private Double accuracyPercentage;
    private String timeSpent; // e.g. "01:14:30"
    
    // Section by section breakdown
    private List<SectionScoreDTO> sectionScores;
    
    // The detailed answer sheet grid
    private List<ReviewDTO> reviewGrid;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionScoreDTO {
        private String sectionName;
        private Integer correctCount;
        private Integer totalCount;
        private Double sectionScore;
    }
}
