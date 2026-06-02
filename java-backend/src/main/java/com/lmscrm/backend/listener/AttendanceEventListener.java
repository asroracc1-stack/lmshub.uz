package com.lmscrm.backend.listener;

import com.lmscrm.backend.domain.entity.Lesson;
import com.lmscrm.backend.domain.entity.Subject;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.event.AttendanceSavedEvent;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.SubjectRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.communication.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceEventListener {

    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final SubjectRepository subjectRepository;
    private final TelegramNotificationService telegramNotificationService;

    @Async
    @EventListener
    public void handleAttendanceSaved(AttendanceSavedEvent event) {
        log.info("Asynchronously processing Telegram notification for studentId: {}", event.getStudentId());

        try {
            User student = userRepository.findById(event.getStudentId()).orElse(null);
            Lesson lesson = lessonRepository.findById(event.getLessonId()).orElse(null);
            Subject subject = subjectRepository.findById(event.getSubjectId()).orElse(null);

            if (student == null) {
                log.error("Student not found for ID: {}", event.getStudentId());
                return;
            }
            if (lesson == null) {
                log.error("Lesson not found for ID: {}", event.getLessonId());
                return;
            }
            if (subject == null) {
                log.error("Subject not found for ID: {}", event.getSubjectId());
                return;
            }

            telegramNotificationService.notifyCombinedReport(
                    student,
                    event.getStatus(),
                    lesson.getTitle(),
                    subject.getName(),
                    event.getScore(),
                    event.getComment(),
                    event.getCoins()
            );

        } catch (Exception e) {
            log.error("Error sending asynchronous Telegram notification: {}", e.getMessage(), e);
        }
    }
}
