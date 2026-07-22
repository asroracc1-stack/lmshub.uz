package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class MultipleChoiceValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "MULTIPLE_CHOICE".equalsIgnoreCase(answerType) 
            || "multiple_choice".equalsIgnoreCase(answerType)
            || "multi_select".equalsIgnoreCase(answerType);
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

        Set<String> correctSet = parseCsv(key.getCorrectAnswer());
        Set<String> studentSet = parseCsv(studentAnswer);

        if (correctSet.isEmpty()) {
            return ValidationResult.builder()
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .feedback("Empty answer key configuration")
                    .build();
        }

        long correctSelected = studentSet.stream().filter(correctSet::contains).count();
        long incorrectSelected = studentSet.stream().filter(s -> !correctSet.contains(s)).count();

        boolean exactMatch = (correctSelected == correctSet.size()) && (incorrectSelected == 0);
        double maxPoints = key.getPoints() != null ? key.getPoints() : 1.0;
        double earnedPoints = 0.0;

        if (exactMatch) {
            earnedPoints = maxPoints;
        } else if (Boolean.TRUE.equals(key.getPartialScoring())) {
            // Partial scoring: (correct selected - incorrect selected) / total correct
            double netScore = (double) (correctSelected - incorrectSelected) / correctSet.size();
            earnedPoints = Math.max(0.0, netScore * maxPoints);
        }

        boolean ok = earnedPoints > 0.0;
        double neg = exactMatch ? 0.0 : (key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0);

        return ValidationResult.builder()
                .isCorrect(exactMatch)
                .pointsEarned(earnedPoints)
                .negativeMarks(neg)
                .feedback(exactMatch ? "Correct" : String.format("Partial match. Correctly matched %d/%d, Incorrect: %d", correctSelected, correctSet.size(), incorrectSelected))
                .build();
    }

    private Set<String> parseCsv(String input) {
        if (input == null) return Set.of();
        return Arrays.stream(input.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }
}
