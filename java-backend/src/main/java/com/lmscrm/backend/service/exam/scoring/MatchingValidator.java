package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class MatchingValidator implements AnswerValidator {

    @Override
    public boolean supports(String answerType) {
        return "MATCHING".equalsIgnoreCase(answerType)
            || "matching".equalsIgnoreCase(answerType)
            || "headings".equalsIgnoreCase(answerType);
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

        Map<String, String> correctMap = parsePairs(key.getCorrectAnswer());
        Map<String, String> studentMap = parsePairs(studentAnswer);

        if (correctMap.isEmpty()) {
            return ValidationResult.builder()
                    .isCorrect(false)
                    .pointsEarned(0.0)
                    .feedback("Invalid answer key format")
                    .build();
        }

        long correctCount = 0;
        for (Map.Entry<String, String> entry : correctMap.entrySet()) {
            String studentVal = studentMap.get(entry.getKey());
            if (studentVal != null && studentVal.trim().equalsIgnoreCase(entry.getValue().trim())) {
                correctCount++;
            }
        }

        double maxPoints = key.getPoints() != null ? key.getPoints() : 1.0;
        double earnedPoints = 0.0;
        boolean allMatched = correctCount == correctMap.size();

        if (allMatched) {
            earnedPoints = maxPoints;
        } else if (Boolean.TRUE.equals(key.getPartialScoring())) {
            earnedPoints = ((double) correctCount / correctMap.size()) * maxPoints;
        }

        double neg = allMatched ? 0.0 : (key.getNegativeMarking() != null ? key.getNegativeMarking() : 0.0);

        return ValidationResult.builder()
                .isCorrect(allMatched)
                .pointsEarned(earnedPoints)
                .negativeMarks(neg)
                .feedback(String.format("Matched %d/%d pairs", correctCount, correctMap.size()))
                .build();
    }

    private Map<String, String> parsePairs(String input) {
        Map<String, String> map = new HashMap<>();
        if (input == null) return map;

        // Clean JSON formatting if stored as a JSON object, otherwise parse as CSV pairs key=val
        String cleaned = input.replaceAll("[\\{\\}\"\']", "").trim();
        String[] pairs = cleaned.split("[,;]");
        for (String pair : pairs) {
            String[] kv = pair.split("[:=]");
            if (kv.length == 2) {
                map.put(kv[0].trim().toLowerCase(), kv[1].trim().toLowerCase());
            }
        }
        return map;
    }
}
