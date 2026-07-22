package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

@Component
public class FillBlankValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "FILL_BLANK".equalsIgnoreCase(answerType)
            || "fill_blank".equalsIgnoreCase(answerType)
            || "fill".equalsIgnoreCase(answerType)
            || "short_answer".equalsIgnoreCase(answerType)
            || "short".equalsIgnoreCase(answerType);
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

        String u = normalizeAnswer(studentAnswer);
        String correct = key.getCorrectAnswer();
        if (correct == null || correct.trim().isEmpty()) {
            return ValidationResult.builder()
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .feedback("Answer key is not set")
                    .build();
        }

        boolean matchFound = false;
        String[] variants = correct.split("[/|]");
        for (String variant : variants) {
            String v = normalizeAnswer(variant);
            if (!v.isEmpty()) {
                if (u.equals(v) || u.equals(v.replaceFirst("^(the|a|an) ", ""))) {
                    matchFound = true;
                    break;
                }
            }
        }

        double points = matchFound ? (key.getPoints() != null ? key.getPoints() : 1.0) : 0.0;
        double neg = matchFound ? 0.0 : (key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0);

        return ValidationResult.builder()
                .isCorrect(matchFound)
                .pointsEarned(points)
                .negativeMarks(neg)
                .feedback(matchFound ? "Correct" : "Incorrect. Correct answer is: " + correct)
                .build();
    }

    private String normalizeAnswer(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase()
                .replaceAll("\\s+", " ")
                .replaceAll("[.,!?;:'\"`]", "");
    }
}
