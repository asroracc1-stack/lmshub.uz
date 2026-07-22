package com.lmscrm.backend.service.exam.verification;

import com.lmscrm.backend.domain.entity.AnswerKey;
import com.lmscrm.backend.dto.exam.runtime.ReviewDTO;

/**
 * Strategy interface for deterministic answer verification.
 */
public interface VerificationStrategy {
    
    /**
     * Determines if this strategy supports the given answer type.
     */
    boolean supports(String answerType);

    /**
     * Strictly verifies the student's raw answer payload against the immutable AnswerKey.
     * @param studentAnswer The raw text/json submitted by the student
     * @param answerKey The highly secure, immutable answer key from DB
     * @return ReviewDTO containing the verification result and awarded points
     */
    ReviewDTO verify(String studentAnswer, AnswerKey answerKey);
}
