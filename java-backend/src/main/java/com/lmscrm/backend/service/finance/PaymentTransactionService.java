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

    @Transactional(readOnly = true)
    public List<AdminPaymentInfoDto> getAdminsForPayment(UUID organizationId) {
        List<User> users = userRepository.findByOrganizationId(organizationId);
        return users.stream()
                .filter(u -> u.isActive() && (u.getRole() == AppRole.ADMIN || u.getRole() == AppRole.ADMINISTRATOR || u.getRole() == AppRole.SUPER_ADMIN))
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

        // Telegram xabarnomasi yuborish
        try {
            telegramNotificationService.notifyPaymentRequest(admin, student, req.getAmount(), req.getPaymentProofUrl());
        } catch (Exception e) {
            log.error("Telegram xabarnomasi yuborishda xatolik: {}", e.getMessage());
        }

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentTransactionDto> getHistory(User currentUser) {
        List<PaymentTransaction> list = paymentTransactionRepository.findByStudentOrPayerId(currentUser.getId());
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
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
