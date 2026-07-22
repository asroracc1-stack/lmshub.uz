package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

@Component
public class SingleChoiceValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "SINGLE_CHOICE".equalsIgnoreCase(answerType) || "mcq".equalsIgnoreCase(answerType);
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

        String normalizedUser = normalize(studentAnswer);
        String normalizedCorrect = normalize(key.getCorrectAnswer());

        boolean correct = normalizedUser.equals(normalizedCorrect);
        double score = correct ? (key.getPoints() != null ? key.getPoints() : 1.0) : 0.0;
        double neg = correct ? 0.0 : (key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0);

        return ValidationResult.builder()
                .isCorrect(correct)
                .pointsEarned(score)
                .negativeMarks(neg)
                .feedback(correct ? "Correct" : "Incorrect. Correct answer is: " + key.getCorrectAnswer())
                .build();
    }

    private String normalize(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
