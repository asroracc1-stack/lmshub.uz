package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

@Component
public class MathValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "MATH".equalsIgnoreCase(answerType)
            || "math".equalsIgnoreCase(answerType);
    }

    @Override
    public ValidationResult validate(AnswerKey key, String studentAnswer) {
        if (studentAnswer == null || studentAnswer.trim().isEmpty()) {
            return ValidationResult.builder()
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .negativeMarks(key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0)
                    .feedback("No answer submitted")
                    .build();
        }

        try {
            double uVal = Double.parseDouble(studentAnswer.trim());
            double cVal = Double.parseDouble(key.getCorrectAnswer().trim());
            double tol = key.getTolerance() != null ? key.getTolerance() : 0.0;

            boolean correct = Math.abs(uVal - cVal) <= tol;
            double points = correct ? (key.getPoints() != null ? key.getPoints() : 1.0) : 0.0;
            double neg = correct ? 0.0 : (key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0);

            return ValidationResult.builder()
                    .isCorrect(correct)
                    .pointsEarned(points)
                    .negativeMarks(neg)
                    .feedback(correct ? "Correct" : String.format("Incorrect. Correct: %f, Tolerance: %f", cVal, tol))
                    .build();
        } catch (NumberFormatException e) {
            return ValidationResult.builder()
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .negativeMarks(key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0)
                    .feedback("Invalid numeric format: " + studentAnswer)
                    .build();
        }
    }
}
