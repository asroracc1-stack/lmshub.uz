package com.lmscrm.backend.service.exam.analytics;

import com.lmscrm.backend.domain.entity.Question;
import com.lmscrm.backend.domain.entity.QuestionAnalytic;
import com.lmscrm.backend.domain.entity.StudentAnswer;
import com.lmscrm.backend.repository.QuestionAnalyticRepository;
import com.lmscrm.backend.repository.QuestionRepository;
import com.lmscrm.backend.repository.StudentAnswerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionAnalyticsEngine {

    private final QuestionAnalyticRepository questionAnalyticRepository;
    private final QuestionRepository questionRepository;
    private final StudentAnswerRepository studentAnswerRepository;

    @Transactional
    public void recalculateAnalytics(UUID questionId) {
        Question question = questionRepository.findById(questionId).orElse(null);
        if (question == null) return;

        List<StudentAnswer> answers = studentAnswerRepository.findAll().stream()
                .filter(a -> a.getQuestion().getId().equals(questionId))
                .collect(Collectors.toList());

        if (answers.isEmpty()) return;

        long correct = 0;
        long wrong = 0;
        long skip = 0;
        long totalTime = 0;

        for (StudentAnswer a : answers) {
            if (Boolean.TRUE.equals(a.getIsCorrect())) {
                correct++;
            } else if (a.getUserAnswerText() == null || a.getUserAnswerText().trim().isEmpty()) {
                skip++;
            } else {
                wrong++;
            }
            totalTime += a.getTimeSpentSeconds() != null ? a.getTimeSpentSeconds() : 0;
        }

        long total = answers.size();
        double difficulty = (double) correct / total;
        double avgTime = (double) totalTime / total * 1000.0; // time in ms
        double discrimination = difficulty * 0.9; // proxy correlation value

        QuestionAnalytic analytic = questionAnalyticRepository.findByQuestionId(questionId)
                .orElseGet(() -> QuestionAnalytic.builder().question(question).build());

        analytic.setDifficultyIndex(difficulty);
        analytic.setDiscriminationIndex(discrimination);
        analytic.setAverageTimeMs((long) avgTime);
        analytic.setCorrectCount((int) correct);
        analytic.setWrongCount((int) wrong);
        analytic.setSkipCount((int) skip);

        questionAnalyticRepository.save(analytic);
        log.info("Recalculated analytics for question {}: diff={}, avgTime={}ms", questionId, difficulty, avgTime);
    }
}
