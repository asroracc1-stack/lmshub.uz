package com.lmscrm.backend.dto.exam.runtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Specifically provisioned for the Premium Results Review Screen.
 * Exposes correct answers and validation status ONLY after the exam is complete.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDTO {
    
    private UUID questionId;
    private String questionText;
    private String questionType;
    
    // The student's submitted answer payload
    private String studentAnswer;
    
    // The actual correct answer from the immutable AnswerKey
    private String correctAnswer;
    
    // Calculated securely on the backend
    private boolean isCorrect;
    
    private Integer pointsAwarded;
    
    private String explanation; // Provided by AI/Teacher during import
}
