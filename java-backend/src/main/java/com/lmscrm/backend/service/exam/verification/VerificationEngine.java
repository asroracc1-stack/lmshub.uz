package com.lmscrm.backend.service.exam.verification;

import com.lmscrm.backend.domain.entity.AnswerKey;
import com.lmscrm.backend.dto.exam.runtime.ReviewDTO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VerificationEngine {

    private final List<VerificationStrategy> strategies;

    public VerificationEngine(List<VerificationStrategy> strategies) {
        this.strategies = strategies;
    }

    /**
     * Verifies a student's answer using the appropriate strategy.
     * @param studentAnswer The raw payload submitted by the student
     * @param answerKey The immutable correct answer key from DB
     * @return ReviewDTO containing grading result
     */
    public ReviewDTO verifyAnswer(String studentAnswer, AnswerKey answerKey) {
        
        VerificationStrategy strategy = strategies.stream()
                .filter(s -> s.supports(answerKey.getAnswerType()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No Verification Strategy found for type: " + answerKey.getAnswerType()));

        return strategy.verify(studentAnswer, answerKey);
    }
}
