package com.lmscrm.backend.listener;

import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.event.ExamSubmittedEvent;
import com.lmscrm.backend.repository.StudentAttemptRepository;
import com.lmscrm.backend.service.finance.CoinService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AchievementEventListener {

    private final StudentAttemptRepository attemptRepository;
    private final CoinService coinService;

    @EventListener
    @Async
    public void onExamSubmitted(ExamSubmittedEvent event) {
        User student = event.getStudent();
        StudentAttempt attempt = event.getAttempt();

        long completedAttempts = attemptRepository.findAllByStudentId(student.getId()).stream()
                .filter(a -> a.getFinishedAt() != null)
                .count();

        if (completedAttempts == 1) {
            log.info("Student {} unlocked First Exam Achievement!", student.getEmail());
            coinService.addCoins(student, 5, "Unlocked achievement: Completed First Exam", "ACHIEVEMENT_REWARD", null);
        }

        if (event.isPassed() && event.getCorrectAnswers() == event.getTotalQuestions()) {
            log.info("Student {} unlocked Perfect Score Achievement!", student.getEmail());
            coinService.addCoins(student, 15, "Unlocked achievement: Perfect Score in " + attempt.getExam().getTitle(), "ACHIEVEMENT_REWARD", null);
        }
    }
}
