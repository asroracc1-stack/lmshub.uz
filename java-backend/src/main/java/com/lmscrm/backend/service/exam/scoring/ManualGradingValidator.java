package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

@Component
public class ManualGradingValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "ESSAY".equalsIgnoreCase(answerType)
            || "SPEAKING".equalsIgnoreCase(answerType)
            || "essay".equalsIgnoreCase(answerType)
            || "speaking".equalsIgnoreCase(answerType);
    }

    @Override
    public ValidationResult validate(AnswerKey key, String studentAnswer) {
        if (studentAnswer == null || studentAnswer.trim().isEmpty()) {
            return ValidationResult.builder()
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .feedback("No response submitted")
                    .build();
        }

        // Subjective assessments are initially graded with 0 points and marked for manual/AI evaluation.
        return ValidationResult.builder()
                .isCorrect(false)
                .pointsEarned(0.0)
                .negativeMarks(0.0)
                .feedback("Response saved. Pending AI/Teacher evaluation.")
                .build();
    }
}
