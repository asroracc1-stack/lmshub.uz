package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.admin.SuperAdminStatsDto;
import com.lmscrm.backend.repository.OrganizationRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.AuditLogRepository;
import com.lmscrm.backend.repository.CoinTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SuperAdminService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final AuditLogRepository auditLogRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final com.lmscrm.backend.repository.GroupRepository groupRepository;

    @Transactional(readOnly = true)
    public SuperAdminStatsDto getDashboardStats() {
        log.info("📊 Fetching real-time SuperAdmin stats from database...");
        
        // 1. Role-based counts
        SuperAdminStatsDto.Stats stats = SuperAdminStatsDto.Stats.builder()
                .organizations(organizationRepository.count())
                .totalUsers(userRepository.count())
                .teachers(userRepository.countByRole(AppRole.TEACHER))
                .students(userRepository.countByRole(AppRole.STUDENT))
                .admins(userRepository.countByRole(AppRole.ADMIN))
                .administrators(userRepository.countByRole(AppRole.ADMINISTRATOR))
                .users(userRepository.countByRole(AppRole.USER))
                .parents(userRepository.countByRole(AppRole.PARENT))
                .groups(groupRepository.count())
                .build();

        // 2. Real Growth Data (Last 6 months)
        List<SuperAdminStatsDto.MonthPoint> growth = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 5; i >= 0; i--) {
            LocalDateTime start = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime end = start.plusMonths(1);
            long count = userRepository.countByCreatedAtBefore(end);
            // Using Locale.ROOT to avoid uz locale dependency issues in different environments
            String monthName = start.getMonth().getDisplayName(TextStyle.SHORT, Locale.ROOT);
            growth.add(new SuperAdminStatsDto.MonthPoint(monthName, (int) count));
        }

        // 3. Top Organizations by User Count
        List<SuperAdminStatsDto.OrgPoint> topOrgs = organizationRepository.findAll().stream()
                .map(org -> new SuperAdminStatsDto.OrgPoint(org.getName(), userRepository.countByOrganizationId(org.getId())))
                .sorted((a, b) -> Integer.compare(b.getUsers(), a.getUsers()))
                .limit(5)
                .collect(Collectors.toList());

        // 4. Recent Activity (Audit Logs)
        List<SuperAdminStatsDto.AuditLogItem> recentActivity = auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10))
                .getContent().stream()
                .map(log -> SuperAdminStatsDto.AuditLogItem.builder()
                        .id(log.getId().toString())
                        .action(log.getAction())
                        .actor(log.getUsername() != null ? log.getUsername() : "System")
                        .at(log.getCreatedAt().toString())
                        .build())
                .collect(Collectors.toList());

        return SuperAdminStatsDto.builder()
                .stats(stats)
                .growth(growth)
                .topOrgs(topOrgs)
                .recentActivity(recentActivity)
                .build();
    }

    @Transactional
    public void grantCoins(UUID userId, Long amount, String reason) {
        com.lmscrm.backend.domain.entity.User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User topilmadi"));

        if (user.getOrganizationId() != null) {
            throw new RuntimeException("Faqat mustaqil (Regular) foydalanuvchilarga coin berish mumkin");
        }

        user.setCoins((user.getCoins() != null ? user.getCoins() : 0L) + amount);
        userRepository.save(user);

        com.lmscrm.backend.domain.entity.CoinTransaction transaction = com.lmscrm.backend.domain.entity.CoinTransaction.builder()
                .student(user)
                .amount(amount.intValue())
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();
        coinTransactionRepository.save(transaction);
        log.info("🪙 Granted {} coins to user {}", amount, user.getEmail());
    }
}
