package com.lmscrm.backend.listener;

import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.event.ExamSubmittedEvent;
import com.lmscrm.backend.service.communication.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;

    @EventListener
    @Async
    public void onExamSubmitted(ExamSubmittedEvent event) {
        User student = event.getStudent();
        StudentAttempt attempt = event.getAttempt();

        String title = "Exam Submitted Successfully";
        String message = String.format("You completed '%s' with a score of %d/%d (Band/Score: %.1f).",
                attempt.getExam().getTitle(),
                event.getCorrectAnswers(),
                event.getTotalQuestions(),
                attempt.getOverallBand() != null ? attempt.getOverallBand() : 0.0);

        log.info("Sending exam completion notification for user {}", student.getEmail());
        notificationService.createNotification(student, title, message, NotificationType.ACADEMIC);
    }
}
