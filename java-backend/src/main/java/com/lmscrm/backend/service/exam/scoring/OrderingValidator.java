package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class OrderingValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "ORDERING".equalsIgnoreCase(answerType)
            || "ordering".equalsIgnoreCase(answerType);
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

        List<String> correctSeq = parseSeq(key.getCorrectAnswer());
        List<String> studentSeq = parseSeq(studentAnswer);

        boolean correct = correctSeq.equals(studentSeq);
        double maxPoints = key.getPoints() != null ? key.getPoints() : 1.0;
        double earnedPoints = correct ? maxPoints : 0.0;

        if (!correct && Boolean.TRUE.equals(key.getPartialScoring())) {
            // Count items in exact correct indices
            long exactMatches = 0;
            int minLen = Math.min(correctSeq.size(), studentSeq.size());
            for (int i = 0; i < minLen; i++) {
                if (correctSeq.get(i).equalsIgnoreCase(studentSeq.get(i))) {
                    exactMatches++;
                }
            }
            earnedPoints = ((double) exactMatches / correctSeq.size()) * maxPoints;
        }

        double neg = correct ? 0.0 : (key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0);

        return ValidationResult.builder()
                .isCorrect(correct)
                .pointsEarned(earnedPoints)
                .negativeMarks(neg)
                .feedback(correct ? "Correct" : "Incorrect sequence order")
                .build();
    }

    private List<String> parseSeq(String input) {
        if (input == null) return List.of();
        return Arrays.stream(input.replaceAll("[\\[\\]\"\'\\{\\}]", "").split("[,;>-]"))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
