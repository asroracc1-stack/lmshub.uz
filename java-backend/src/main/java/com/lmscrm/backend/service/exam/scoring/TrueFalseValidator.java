package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

@Component
public class TrueFalseValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "TRUE_FALSE".equalsIgnoreCase(answerType)
            || "tfng".equalsIgnoreCase(answerType)
            || "ynng".equalsIgnoreCase(answerType);
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

        String u = normalizeTF(studentAnswer);
        String c = normalizeTF(key.getCorrectAnswer());

        boolean correct = u.equals(c) && !c.isEmpty();
        double points = correct ? (key.getPoints() != null ? key.getPoints() : 1.0) : 0.0;
        double neg = correct ? 0.0 : (key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0);

        return ValidationResult.builder()
                .isCorrect(correct)
                .pointsEarned(points)
                .negativeMarks(neg)
                .feedback(correct ? "Correct" : "Incorrect. Correct answer is: " + key.getCorrectAnswer())
                .build();
    }

    private String normalizeTF(String raw) {
        if (raw == null) return "";
        String s = raw.trim().toUpperCase();
        if (s.equals("TRUE") || s.equals("T") || s.equals("YES") || s.equals("Y")) {
            return "TRUE";
        }
        if (s.equals("FALSE") || s.equals("F") || s.equals("NO") || s.equals("N")) {
            return "FALSE";
        }
        if (s.contains("NOT") || s.equals("NG")) {
            return "NOT GIVEN";
        }
        return s;
    }
}
