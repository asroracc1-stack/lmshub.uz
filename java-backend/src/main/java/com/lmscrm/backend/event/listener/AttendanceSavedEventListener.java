package com.lmscrm.backend.event.listener;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.event.AttendanceSavedEvent;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.SubjectRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.ParentStudentLinkRepository;
import com.lmscrm.backend.service.communication.NotificationService;
import com.lmscrm.backend.service.communication.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceSavedEventListener {

    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final SubjectRepository subjectRepository;
    private final ParentStudentLinkRepository parentStudentLinkRepository;
    private final NotificationService notificationService;
    private final TelegramNotificationService telegramNotificationService;

    @Async
    @EventListener
    public void handleAttendanceSavedEvent(AttendanceSavedEvent event) {
        try {
            // Load entities
            User student = userRepository.findById(event.getStudentId()).orElse(null);
            if (student == null) {
                log.warn("Student not found for AttendanceSavedEvent: {}", event.getStudentId());
                return;
            }
            var lessonOpt = lessonRepository.findById(event.getLessonId());
            var subjectOpt = subjectRepository.findById(event.getSubjectId());
            String lessonName = lessonOpt.map(l -> l.getTitle()).orElse("Noma'lum dars");
            String subjectName = subjectOpt.map(s -> s.getName()).orElse("Noma'lum fan");

            // Build combined report message (same as Telegram version)
            String combinedMessage = buildCombinedMessage(event.getStatus(), lessonName, subjectName, event.getScore(), event.getComment(), event.getCoins());

            // Send Telegram notifications (student + parents) via service method
            telegramNotificationService.notifyCombinedReport(student, event.getStatus(), lessonName, subjectName, event.getScore(), event.getComment(), event.getCoins());

            // In‑app notifications for student
            notificationService.createNotification(
                    student,
                    "Dars hisobi",
                    combinedMessage,
                    NotificationType.ATTENDANCE);

            // In‑app notifications for each parent
            parentStudentLinkRepository.findAllByStudentId(student.getId())
                    .forEach(link -> {
                        User parent = link.getParent();
                        notificationService.createNotification(
                                parent,
                                "O'quvchi dars hisobi",
                                combinedMessage,
                                NotificationType.ATTENDANCE);
                    });
        } catch (Exception e) {
            log.error("Error handling AttendanceSavedEvent: {}", e.getMessage(), e);
        }
    }

    private String buildCombinedMessage(AttendanceStatus status, String lessonName, String subjectName,
                                        Integer score, String comment, Integer coins) {
        String statusEmoji = status == AttendanceStatus.PRESENT ? "✅" : (status == AttendanceStatus.LATE ? "⏳" : "❌");
        String statusText = status == AttendanceStatus.PRESENT ? "Bor" : (status == AttendanceStatus.LATE ? "Kechikdi" : "Yo'q");
        StringBuilder sb = new StringBuilder();
        sb.append("📊 <b>Kunlik Dars Hisoboti</b>\n\n");
        sb.append(String.format("👤 O'quvchi: <b>%s</b>\n", "%s")); // placeholder, will be replaced
        sb.append(String.format("📚 Fan: <b>%s</b>\n", subjectName));
        sb.append(String.format("📖 Dars: %s\n", lessonName));
        sb.append(String.format("⏱ Davomat: %s %s\n", statusEmoji, statusText));
        if (score != null && score > 0) {
            sb.append(String.format("📝 Baho: <b>%d / 100</b>\n", score));
        }
        if (coins != null && coins > 0) {
            sb.append(String.format("🪙 Rag'bat: <b>+%d coin</b>\n", coins));
        }
        if (comment != null && !comment.isBlank()) {
            sb.append(String.format("\n💬 Izoh: <i>%s</i>\n", comment));
        }
        return sb.toString();
    }
}
