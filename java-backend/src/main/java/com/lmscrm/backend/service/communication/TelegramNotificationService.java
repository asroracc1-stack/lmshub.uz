package com.lmscrm.backend.service.communication;

import com.lmscrm.backend.domain.entity.ParentStudentLink;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.repository.ParentStudentLinkRepository;
import com.lmscrm.backend.service.TelegramBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramNotificationService {

    private final TelegramBotService telegramBotService;
    private final ParentStudentLinkRepository parentStudentLinkRepository;

    public void notifyAttendance(User student, AttendanceStatus status, String lessonName) {
        String statusEmoji = status == AttendanceStatus.PRESENT ? "✅" : "❌";
        String statusText = status == AttendanceStatus.PRESENT ? "Darsda qatnashdi" : "Darsga kelmadi";
        
        String message = String.format(
            "🔔 <b>Yo'qlama xabarnomasi</b>\n\n" +
            "Talaba: <b>%s</b>\n" +
            "Dars: %s\n" +
            "Holat: %s %s",
            student.getFullName(), lessonName, statusEmoji, statusText
        );

        sendToParents(student, message);
    }

    public void notifyGrade(User student, Integer score, Integer maxScore, String subjectName, String comment) {
        String message = String.format(
            "📝 <b>Yangi baho</b>\n\n" +
            "Talaba: <b>%s</b>\n" +
            "Fan: %s\n" +
            "Baho: <b>%d / %d</b>\n" +
            "%s",
            student.getFullName(), subjectName, score, maxScore,
            (comment != null && !comment.isBlank()) ? "Izoh: " + comment : ""
        );

        sendToParents(student, message);
    }

    public void notifyCoins(User student, Integer amount, String reason) {
        String emoji = amount > 0 ? "🪙" : "📉";
        String action = amount > 0 ? "berildi" : "ayirildi";
        
        String message = String.format(
            "💰 <b>LMS-Coin xabarnomasi</b>\n\n" +
            "Talaba: <b>%s</b>\n" +
            "Miqdor: %s <b>%d coin</b> %s\n" +
            "Sabab: %s",
            student.getFullName(), emoji, Math.abs(amount), action, reason
        );

        sendToParents(student, message);
    }

    private void sendToParents(User student, String message) {
        List<ParentStudentLink> links = parentStudentLinkRepository.findAllByStudentId(student.getId());
        if (links.isEmpty()) {
            log.debug("No parents found for student: {}", student.getUsername());
            return;
        }

        for (ParentStudentLink link : links) {
            User parent = link.getParent();
            String chatId = parent.getTelegramChatId();
            
            if (chatId != null && !chatId.isBlank()) {
                telegramBotService.sendMessageTo(chatId, message);
            } else {
                log.warn("Parent {} has no telegram_chat_id. Skipping notification.", parent.getUsername());
            }
        }
    }

    public void notifyPaymentRequest(User admin, User student, Double amount, String proofUrl) {
        String message = String.format(
            "💳 <b>Yangi to'lov so'rovi</b>\n\n" +
            "Talaba: <b>%s</b>\n" +
            "Miqdor: <b>%,.2f so'm</b>\n" +
            "Cheq: %s\n\n" +
            "Saytga kiring va to'lovni tasdiqlang!",
            student.getFullName(), amount, proofUrl
        );
        if (admin.getTelegramChatId() != null && !admin.getTelegramChatId().isBlank()) {
            telegramBotService.sendMessageTo(admin.getTelegramChatId(), message);
        } else {
            telegramBotService.sendMessage(message);
        }
    }

    public void notifyPaymentStatusChange(User student, Double amount, String status) {
        String statusText = status.equalsIgnoreCase("APPROVED") ? "✅ Tasdiqlandi" : "❌ Rad etildi";
        String message = String.format(
            "💳 <b>To'lov holati o'zgardi</b>\n\n" +
            "Talaba: <b>%s</b>\n" +
            "Miqdor: <b>%,.2f so'm</b>\n" +
            "Holat: <b>%s</b>",
            student.getFullName(), amount, statusText
        );
        sendToParents(student, message);
        if (student.getTelegramChatId() != null && !student.getTelegramChatId().isBlank()) {
            telegramBotService.sendMessageTo(student.getTelegramChatId(), message);
        }
    }
}

