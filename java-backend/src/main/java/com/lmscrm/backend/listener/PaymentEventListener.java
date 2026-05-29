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
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Async;
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
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW, readOnly = true)
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

        // Build admin notification message
        String adminMessage;
        if (tx.getPayer() != null && !tx.getPayer().getId().equals(student.getId())) {
            String payerName = escapeHtml(tx.getPayer().getFullName() != null ? tx.getPayer().getFullName() : tx.getPayer().getUsername());
            adminMessage = String.format(
                    "🔔 Yangi to'lov cheki!\n" +
                    "👨‍👩‍👧 To'lovchi: %s\n" +
                    "🎓 Farzandi: %s\n" +
                    "💰 Summa: %s UZS\n" +
                    "📝 Izoh: %s\n" +
                    "Saytga kirib tasdiqlang yoki rad eting!",
                    payerName, studentName, amountFormatted, noteText
            );
        } else {
            adminMessage = String.format(
                    "🔔 Yangi to'lov cheki!\n" +
                    "👤 Talaba: %s\n" +
                    "💰 Summa: %s UZS\n" +
                    "📝 Izoh: %s\n" +
                    "Saytga kirib tasdiqlang yoki rad eting!",
                    studentName, amountFormatted, noteText
            );
        }

        // Build payer confirmation message
        String adminName = escapeHtml(admin != null && admin.getFullName() != null ? admin.getFullName() : "Admin");
        String payerConfirmMessage = String.format(
                "✅ To'lov chekingiz muvaffaqiyatli yuborildi!\n" +
                "💰 Summa: %s UZS\n" +
                "👤 Qabul qiluvchi: %s\n" +
                "📝 Izoh: %s\n" +
                "⏳ Admin tekshirib tasdiqlagach sizga xabar beriladi.",
                amountFormatted, adminName, noteText
        );

        // --- 1. Notify admin recipients ---
        List<User> adminRecipients = new ArrayList<>();
        if (admin != null) adminRecipients.add(admin);
        if (tx.getOrganizationId() != null) {
            List<User> supers = userRepository.findByRoleAndOrganizationId(AppRole.SUPER_ADMIN, tx.getOrganizationId());
            if (supers != null) adminRecipients.addAll(supers);
            
            List<User> admins = userRepository.findByRoleAndOrganizationId(AppRole.ADMIN, tx.getOrganizationId());
            if (admins != null) adminRecipients.addAll(admins);

            List<User> administrators = userRepository.findByRoleAndOrganizationId(AppRole.ADMINISTRATOR, tx.getOrganizationId());
            if (administrators != null) adminRecipients.addAll(administrators);

            List<User> packs = userRepository.findByRoleAndOrganizationId(AppRole.PACK_MANAGER, tx.getOrganizationId());
            if (packs != null) adminRecipients.addAll(packs);
        }

        // Determine photo URL once
        String photoPathOrUrl = null;
        if (tx.getPaymentProofUrl() != null) {
            if (tx.getPaymentProofUrl().contains("/files/view/")) {
                String filename = tx.getPaymentProofUrl().substring(tx.getPaymentProofUrl().lastIndexOf("/files/view/") + 12);
                photoPathOrUrl = "uploads/" + filename;
            } else if (tx.getPaymentProofUrl().startsWith("http")) {
                photoPathOrUrl = tx.getPaymentProofUrl();
            } else {
                photoPathOrUrl = "https://hicoderx.supabase.co/storage/v1/object/public/receipts/" + tx.getPaymentProofUrl();
            }
        }

        // Collect valid unique telegram chat IDs from admins
        java.util.Set<String> validAdminChatIds = new java.util.HashSet<>();
        List<UUID> seen = new ArrayList<>();
        
        for (User r : adminRecipients) {
            if (r == null || r.getId() == null) continue;
            if (seen.contains(r.getId())) continue;
            seen.add(r.getId());

            // In-app Notification
            try {
                notificationService.createNotification(r, "💳 Yangi to'lov cheki yuklandi", adminMessage, NotificationType.FINANCE);
            } catch (Exception e) {
                log.error("Failed to create in-app notification for {}: {}", r.getUsername(), e.getMessage());
            }

            if (r.getTelegramChatId() != null && !r.getTelegramChatId().isBlank()) {
                validAdminChatIds.add(r.getTelegramChatId());
            }
        }

        // Telegram Notification Logic: Send to admins OR fallback to default
        if (validAdminChatIds.isEmpty()) {
            String defaultChatId = telegramBotService.getDefaultChatId();
            if (defaultChatId != null && !defaultChatId.isBlank()) {
                validAdminChatIds.add(defaultChatId);
            }
        }

        for (String targetCid : validAdminChatIds) {
            try {
                if (photoPathOrUrl != null) {
                    telegramBotService.sendPhotoWithButton(targetCid, adminMessage, photoPathOrUrl);
                } else {
                    telegramBotService.sendMessageWithButton(targetCid, adminMessage);
                }
            } catch (Exception e) {
                log.error("Failed to send telegram to {}: {}", targetCid, e.getMessage());
            }
        }

        // --- 2. Notify payer (student or parent) with confirmation ---
        User payer = tx.getPayer() != null ? tx.getPayer() : student;
        try {
            notificationService.createNotification(payer,
                    "✅ To'lovingiz yuborildi",
                    payerConfirmMessage,
                    NotificationType.FINANCE);
        } catch (Exception e) {
            log.error("Failed to create payer confirmation notification: {}", e.getMessage());
        }

        // Also notify student separately if parent paid
        if (tx.getPayer() != null && !tx.getPayer().getId().equals(student.getId())) {
            String studentMsg = String.format(
                    "💳 Ota-onangiz sizning nomingizdan %s UZS to'lov cheki yubordi.\n⏳ Admin tasdiqlashini kuting.",
                    amountFormatted
            );
            try {
                notificationService.createNotification(student,
                        "💳 Sizning nomingizdan to'lov yuborildi",
                        studentMsg,
                        NotificationType.FINANCE);
            } catch (Exception e) {
                log.error("Failed to create student notification: {}", e.getMessage());
            }
        }
    }
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW, readOnly = true)
    public void handlePaymentUpdated(com.lmscrm.backend.event.PaymentUpdatedEvent event) {
        UUID txId = event.getTransactionId();
        log.info("Handling PaymentUpdatedEvent for tx: {}", txId);

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

        // Build admin notification message
        String adminMessage;
        if (tx.getPayer() != null && !tx.getPayer().getId().equals(student.getId())) {
            String payerName = escapeHtml(tx.getPayer().getFullName() != null ? tx.getPayer().getFullName() : tx.getPayer().getUsername());
            adminMessage = String.format(
                    "✏️ To'lov cheki tahrirlandi!\n" +
                    "👨‍👩‍👧 To'lovchi: %s\n" +
                    "🎓 Farzandi: %s\n" +
                    "💰 Yangi summa: %s UZS\n" +
                    "📝 Izoh: %s\n" +
                    "Saytga kirib qayta tekshiring!",
                    payerName, studentName, amountFormatted, noteText
            );
        } else {
            adminMessage = String.format(
                    "✏️ To'lov cheki tahrirlandi!\n" +
                    "👤 Talaba: %s\n" +
                    "💰 Yangi summa: %s UZS\n" +
                    "📝 Izoh: %s\n" +
                    "Saytga kirib qayta tekshiring!",
                    studentName, amountFormatted, noteText
            );
        }

        // Build payer confirmation message
        String adminName = escapeHtml(admin != null && admin.getFullName() != null ? admin.getFullName() : "Admin");
        String payerConfirmMessage = String.format(
                "✏️ To'lov chekingiz tahrirlandi!\n" +
                "💰 Summa: %s UZS\n" +
                "👤 Qabul qiluvchi: %s\n" +
                "📝 Izoh: %s\n" +
                "⏳ Admin tekshirib tasdiqlagach sizga xabar beriladi.",
                amountFormatted, adminName, noteText
        );

        // --- 1. Notify admin recipients ---
        List<User> adminRecipients = new ArrayList<>();
        if (admin != null) adminRecipients.add(admin);
        if (tx.getOrganizationId() != null) {
            List<User> supers = userRepository.findByRoleAndOrganizationId(AppRole.SUPER_ADMIN, tx.getOrganizationId());
            if (supers != null) adminRecipients.addAll(supers);
            
            List<User> admins = userRepository.findByRoleAndOrganizationId(AppRole.ADMIN, tx.getOrganizationId());
            if (admins != null) adminRecipients.addAll(admins);

            List<User> administrators = userRepository.findByRoleAndOrganizationId(AppRole.ADMINISTRATOR, tx.getOrganizationId());
            if (administrators != null) adminRecipients.addAll(administrators);

            List<User> packs = userRepository.findByRoleAndOrganizationId(AppRole.PACK_MANAGER, tx.getOrganizationId());
            if (packs != null) adminRecipients.addAll(packs);
        }

        // Determine photo URL once
        String photoPathOrUrl = null;
        if (tx.getPaymentProofUrl() != null) {
            if (tx.getPaymentProofUrl().contains("/files/view/")) {
                String filename = tx.getPaymentProofUrl().substring(tx.getPaymentProofUrl().lastIndexOf("/files/view/") + 12);
                photoPathOrUrl = "uploads/" + filename;
            } else if (tx.getPaymentProofUrl().startsWith("http")) {
                photoPathOrUrl = tx.getPaymentProofUrl();
            } else {
                photoPathOrUrl = "https://hicoderx.supabase.co/storage/v1/object/public/receipts/" + tx.getPaymentProofUrl();
            }
        }

        // Collect valid unique telegram chat IDs from admins
        java.util.Set<String> validAdminChatIds = new java.util.HashSet<>();
        List<UUID> seen = new ArrayList<>();
        
        for (User r : adminRecipients) {
            if (r == null || r.getId() == null) continue;
            if (seen.contains(r.getId())) continue;
            seen.add(r.getId());

            // In-app Notification
            try {
                notificationService.createNotification(r, "💳 To'lov cheki tahrirlandi", adminMessage, NotificationType.FINANCE);
            } catch (Exception e) {
                log.error("Failed to create in-app notification for {}: {}", r.getUsername(), e.getMessage());
            }

            if (r.getTelegramChatId() != null && !r.getTelegramChatId().isBlank()) {
                validAdminChatIds.add(r.getTelegramChatId());
            }
        }

        // Telegram Notification Logic: Send to admins OR fallback to default
        if (validAdminChatIds.isEmpty()) {
            String defaultChatId = telegramBotService.getDefaultChatId();
            if (defaultChatId != null && !defaultChatId.isBlank()) {
                validAdminChatIds.add(defaultChatId);
            }
        }

        for (String targetCid : validAdminChatIds) {
            try {
                if (photoPathOrUrl != null) {
                    telegramBotService.sendPhotoWithButton(targetCid, adminMessage, photoPathOrUrl);
                } else {
                    telegramBotService.sendMessageWithButton(targetCid, adminMessage);
                }
            } catch (Exception e) {
                log.error("Failed to send telegram to {}: {}", targetCid, e.getMessage());
            }
        }

        // --- 2. Notify payer (student or parent) with confirmation ---
        User payer = tx.getPayer() != null ? tx.getPayer() : student;
        try {
            notificationService.createNotification(payer,
                    "✏️ To'lovingiz tahrirlandi",
                    payerConfirmMessage,
                    NotificationType.FINANCE);
        } catch (Exception e) {
            log.error("Failed to create payer confirmation notification: {}", e.getMessage());
        }
    }
}
