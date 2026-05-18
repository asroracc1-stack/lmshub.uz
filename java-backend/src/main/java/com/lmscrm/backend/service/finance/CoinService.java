package com.lmscrm.backend.service.finance;

import com.lmscrm.backend.domain.entity.CoinTransaction;
import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.finance.CoinTransactionDto;
import com.lmscrm.backend.mapper.FinanceMapper;
import com.lmscrm.backend.repository.CoinTransactionRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.communication.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CoinService {

    private final CoinTransactionRepository coinTransactionRepository;
    private final UserRepository userRepository;
    private final FinanceMapper mapper;
    private final TelegramNotificationService telegramNotificationService;

    @Transactional
    public void addCoins(User student, Integer amount, String reason, String source, User awardedBy) {
        CoinTransaction transaction = CoinTransaction.builder()
                .student(student)
                .amount(amount)
                .reason(reason)
                .source(source)
                .awardedBy(awardedBy)
                .organization(student.getOrganizationId() != null ? Organization.builder().id(student.getOrganizationId()).build() : null)
                .build();

        coinTransactionRepository.save(transaction);

        // Update user's coin balance
        student.setCoins((student.getCoins() != null ? student.getCoins() : 0L) + amount);
        userRepository.save(student);

        // Real-time Telegram notification to parents
        try {
            telegramNotificationService.notifyCoins(student, amount, reason);
        } catch (Exception e) {
            // Log but don't fail
        }
    }

    @Transactional(readOnly = true)
    public List<CoinTransactionDto> getStudentCoinHistory(UUID studentId) {
        return coinTransactionRepository.findByStudentId(studentId).stream()
                .map(mapper::toCoinTransactionDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Integer getStudentBalance(UUID studentId) {
        Integer balance = coinTransactionRepository.getStudentCoinBalance(studentId);
        return balance != null ? balance : 0;
    }

    @Transactional
    public void grantCoins(UUID studentId, Integer amount, String reason, String comment, User awardedBy) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Foydalanuvchi topilmadi"));

        // Security check: Data Isolation
        if (awardedBy.getRole() != com.lmscrm.backend.domain.enums.AppRole.SUPER_ADMIN) {
            if (awardedBy.getOrganizationId() == null || !awardedBy.getOrganizationId().equals(student.getOrganizationId())) {
                throw new RuntimeException("Ruxsat etilmagan: Foydalanuvchi boshqa filialga tegishli");
            }
        }

        String fullReason = comment != null && !comment.trim().isEmpty() ? reason + " (" + comment.trim() + ")" : reason;
        addCoins(student, amount, fullReason, "ADMIN_GRANT", awardedBy);
    }
}
