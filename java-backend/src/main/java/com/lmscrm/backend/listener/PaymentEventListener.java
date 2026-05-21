package com.lmscrm.backend.listener;

import com.lmscrm.backend.domain.entity.PaymentTransaction;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.event.PaymentUploadedEvent;
import com.lmscrm.backend.repository.PaymentTransactionRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.TelegramBotService;
import com.lmscrm.backend.service.communication.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventListener {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserRepository userRepository;
    private final TelegramBotService telegramBotService;
    private final NotificationService notificationService;

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    @Async
    @EventListener
    @Transactional(readOnly = true)
    public void handlePaymentUploaded(PaymentUploadedEvent event) {
        UUID txId = event.getTransactionId();
        log.info("Handling PaymentUploadedEvent for tx: {}", txId);

        PaymentTransaction tx = paymentTransactionRepository.findById(txId).orElse(null);
        if (tx == null) {
            log.warn("PaymentTransaction not found: {}", txId);
            return;
        }

        User admin = tx.getAdmin();
        User student = tx.getStudent();

        String amountFormatted = String.format("%,.0f", tx.getAmount()).replace(',', ' ');
        String noteText = (tx.getNote() != null && !tx.getNote().trim().isEmpty()) ? escapeHtml(tx.getNote()) : "Izohsiz";
        
        String studentName = escapeHtml(student.getFullName() != null ? student.getFullName() : student.getUsername());
        String proofUrl = escapeHtml(tx.getPaymentProofUrl());

        String message;
        if (tx.getPayer() != null && !tx.getPayer().getId().equals(student.getId())) {
            String payerName = escapeHtml(tx.getPayer().getFullName() != null ? tx.getPayer().getFullName() : tx.getPayer().getUsername());
            message = String.format(
                    "🔔 Yangi to'lov cheki!\n" +
                    "👨‍👩‍👧 To'lovchi: %s\n" +
                    "🎓 Farzandi: %s\n" +
                    "💰 Summa: %s UZS\n" +
                    "📝 Izoh: %s\n" +
                    "Saytga kirib tasdiqlang yoki rad eting!\n\n" +
                    "Chek: %s",
                    payerName, studentName, amountFormatted, noteText, proofUrl
            );
        } else {
            message = String.format(
                    "🔔 Yangi to'lov cheki!\n" +
                    "👤 Talaba: %s\n" +
                    "💰 Summa: %s UZS\n" +
                    "📝 Izoh: %s\n" +
                    "Saytga kirib tasdiqlang yoki rad eting!\n\n" +
                    "Chek: %s",
                    studentName, amountFormatted, noteText, proofUrl
            );
        }

        List<User> recipients = new ArrayList<>();
        // Primary admin
        if (admin != null) recipients.add(admin);

        // Super admins and pack managers of same organization
        if (tx.getOrganizationId() != null) {
            List<User> supers = userRepository.findByRoleAndOrganizationId(AppRole.SUPER_ADMIN, tx.getOrganizationId());
            if (supers != null) recipients.addAll(supers);
            List<User> packs = userRepository.findByRoleAndOrganizationId(AppRole.PACK_MANAGER, tx.getOrganizationId());
            if (packs != null) recipients.addAll(packs);
        }

        // Deduplicate by id
        List<UUID> seen = new ArrayList<>();
        for (User r : recipients) {
            if (r == null || r.getId() == null) continue;
            if (seen.contains(r.getId())) continue;
            seen.add(r.getId());

            // Send telegram if chat id present
            try {
                if (r.getTelegramChatId() != null && !r.getTelegramChatId().isBlank()) {
                    telegramBotService.sendMessageTo(r.getTelegramChatId(), message);
                } else {
                    telegramBotService.sendMessage(message);
                }
            } catch (Exception e) {
                log.error("Failed to send telegram to {}: {}", r.getUsername(), e.getMessage());
            }

            // Create in-app notification
            try {
                notificationService.createNotification(r, "Yangi to'lov cheki yuklandi", message, NotificationType.FINANCE);
            } catch (Exception e) {
                log.error("Failed to create in-app notification for {}: {}", r.getUsername(), e.getMessage());
            }
        }
    }
}
