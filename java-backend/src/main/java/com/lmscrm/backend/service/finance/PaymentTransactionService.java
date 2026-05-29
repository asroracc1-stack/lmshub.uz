package com.lmscrm.backend.service.finance;

import com.lmscrm.backend.domain.entity.PaymentTransaction;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.domain.enums.PaymentTransactionStatus;
import com.lmscrm.backend.dto.finance.AdminPaymentInfoDto;
import com.lmscrm.backend.dto.finance.PaymentInitiateRequest;
import com.lmscrm.backend.dto.finance.PaymentTransactionDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.PaymentTransactionRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.communication.TelegramNotificationService;
import com.lmscrm.backend.service.communication.NotificationService;
import com.lmscrm.backend.domain.enums.NotificationType;
import org.springframework.context.ApplicationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentTransactionService {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserRepository userRepository;
    private final TelegramNotificationService telegramNotificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<AdminPaymentInfoDto> getAdminsForPayment(UUID organizationId) {
        if (organizationId == null) {
            return List.of();
        }
        List<User> users = userRepository.findByOrganizationId(organizationId);
        return users.stream()
                .filter(u -> u.isActive() && (u.getRole() == AppRole.ADMIN || u.getRole() == AppRole.ADMINISTRATOR))
                .filter(u -> u.getCardNumber() != null && !u.getCardNumber().trim().isEmpty())
                .map(u -> AdminPaymentInfoDto.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .cardNumber(u.getCardNumber())
                        .cardHolder(u.getCardHolder() != null ? u.getCardHolder() : u.getFullName())
                        .role(u.getRole().name().toLowerCase())
                        .telegramUsername(u.getTelegramUsername())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentTransactionDto initiatePayment(PaymentInitiateRequest req, User currentUser) {
        User student = userRepository.findById(req.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Talaba topilmadi"));

        User admin = userRepository.findById(req.getAdminId())
                .orElseThrow(() -> new ResourceNotFoundException("Admin/Administrator topilmadi"));

        PaymentTransaction transaction = PaymentTransaction.builder()
                .student(student)
                .payer(currentUser)
                .admin(admin)
                .amount(req.getAmount())
                .paymentProofUrl(req.getPaymentProofUrl())
                .status(PaymentTransactionStatus.PENDING)
                .organizationId(student.getOrganizationId())
                .note(req.getNote())
                .build();

        PaymentTransaction saved = paymentTransactionRepository.save(transaction);

        // Publish event for async notifications (in-app + telegram routing)
        try {
            eventPublisher.publishEvent(new com.lmscrm.backend.event.PaymentUploadedEvent(this, saved.getId()));
        } catch (Exception e) {
            log.error("Event publish failed: {}", e.getMessage());
        }

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionDto> getHistory(User currentUser) {
        List<PaymentTransaction> list = paymentTransactionRepository.findByStudentOrPayerId(currentUser.getId());
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public PaymentTransactionDto updatePayment(UUID id, Double amount, String note, String paymentProofUrl, User currentUser) {
        PaymentTransaction tx = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("To'lov so'rovi topilmadi"));

        // Only PENDING transactions can be edited
        if (tx.getStatus() != PaymentTransactionStatus.PENDING) {
            throw new IllegalStateException("Faqat 'Kutilmoqda' holatdagi to'lovlarni tahrirlash mumkin");
        }

        // Only the payer (student or parent) can edit their own payment
        boolean isPayer = tx.getPayer() != null && tx.getPayer().getId().equals(currentUser.getId());
        boolean isStudent = tx.getStudent() != null && tx.getStudent().getId().equals(currentUser.getId());
        if (!isPayer && !isStudent) {
            throw new IllegalStateException("Siz faqat o'z to'lovlaringizni tahrirlashingiz mumkin");
        }

        if (amount != null && amount > 0) tx.setAmount(amount);
        if (note != null) tx.setNote(note);
        if (paymentProofUrl != null && !paymentProofUrl.isBlank()) tx.setPaymentProofUrl(paymentProofUrl);

        PaymentTransaction saved = paymentTransactionRepository.save(tx);
        log.info("Payment {} updated by user {}", id, currentUser.getId());

        try {
            eventPublisher.publishEvent(new com.lmscrm.backend.event.PaymentUpdatedEvent(this, saved.getId()));
        } catch (Exception e) {
            log.error("Event publish failed: {}", e.getMessage());
        }

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public Page<PaymentTransactionDto> getTransactionsForAdmin(UUID organizationId, String statusStr, Pageable pageable) {
        PaymentTransactionStatus status = null;
        if (statusStr != null && !statusStr.equalsIgnoreCase("ALL")) {
            try {
                status = PaymentTransactionStatus.valueOf(statusStr.toUpperCase());
            } catch (Exception ignore) {}
        }
        Page<PaymentTransaction> page = paymentTransactionRepository.findByOrganizationIdAndStatus(organizationId, status, pageable);
        return page.map(this::mapToDto);
    }

    @Transactional
    public PaymentTransactionDto approveTransaction(UUID id, User currentUser) {
        PaymentTransaction transaction = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("To'lov so'rovi topilmadi"));

        transaction.setStatus(PaymentTransactionStatus.APPROVED);
        PaymentTransaction saved = paymentTransactionRepository.save(transaction);

        // Auto-upgrade logic: USER to STUDENT role upgrade
        if (transaction.getStudent().getRole() == AppRole.USER) {
            transaction.getStudent().setRole(AppRole.STUDENT);
            userRepository.save(transaction.getStudent());
        }

        // In-app Notifications
        String amountFormatted = String.format("%,.0f", transaction.getAmount()).replace(',', ' ');
        String approveMsg = String.format("Sizning %s UZS miqdoridagi to'lovingiz admin tomonidan tasdiqlandi.", amountFormatted);
        try {
            notificationService.createNotification(transaction.getStudent(), "💳 To'lovingiz tasdiqlandi", approveMsg, NotificationType.FINANCE);
            if (transaction.getPayer() != null && !transaction.getPayer().getId().equals(transaction.getStudent().getId())) {
                notificationService.createNotification(transaction.getPayer(), "💳 Farzandingiz to'lovi tasdiqlandi", approveMsg, NotificationType.FINANCE);
            }
        } catch (Exception e) {
            log.error("Failed to create in-app notification for approve: {}", e.getMessage());
        }

        try {
            telegramNotificationService.notifyPaymentStatusChange(transaction.getStudent(), transaction.getAmount(), "APPROVED");
        } catch (Exception e) {
            log.error("Telegram xabarnomasi yuborishda xatolik: {}", e.getMessage());
        }

        return mapToDto(saved);
    }

    @Transactional
    public PaymentTransactionDto rejectTransaction(UUID id, User currentUser) {
        PaymentTransaction transaction = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("To'lov so'rovi topilmadi"));

        transaction.setStatus(PaymentTransactionStatus.REJECTED);
        PaymentTransaction saved = paymentTransactionRepository.save(transaction);

        // In-app Notifications
        String amountFormatted = String.format("%,.0f", transaction.getAmount()).replace(',', ' ');
        String rejectMsg = String.format("Sizning %s UZS miqdoridagi to'lovingiz admin tomonidan rad etildi. Iltimos chek va ma'lumotlarni qayta tekshirib yuklang.", amountFormatted);
        try {
            notificationService.createNotification(transaction.getStudent(), "❌ To'lovingiz rad etildi", rejectMsg, NotificationType.FINANCE);
            if (transaction.getPayer() != null && !transaction.getPayer().getId().equals(transaction.getStudent().getId())) {
                notificationService.createNotification(transaction.getPayer(), "❌ Farzandingiz to'lovi rad etildi", rejectMsg, NotificationType.FINANCE);
            }
        } catch (Exception e) {
            log.error("Failed to create in-app notification for reject: {}", e.getMessage());
        }

        try {
            telegramNotificationService.notifyPaymentStatusChange(transaction.getStudent(), transaction.getAmount(), "REJECTED");
        } catch (Exception e) {
            log.error("Telegram xabarnomasi yuborishda xatolik: {}", e.getMessage());
        }

        return mapToDto(saved);
    }

    private PaymentTransactionDto mapToDto(PaymentTransaction p) {
        return PaymentTransactionDto.builder()
                .id(p.getId())
                .studentId(p.getStudent().getId())
                .studentName(p.getStudent().getFullName())
                .payerId(p.getPayer().getId())
                .payerName(p.getPayer().getFullName())
                .adminId(p.getAdmin().getId())
                .adminName(p.getAdmin().getFullName())
                .amount(p.getAmount())
                .paymentProofUrl(p.getPaymentProofUrl())
                .status(p.getStatus())
                .organizationId(p.getOrganizationId())
                .note(p.getNote())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
