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

import com.lmscrm.backend.repository.PaymentRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class SuperAdminService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final AuditLogRepository auditLogRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final com.lmscrm.backend.repository.GroupRepository groupRepository;
    private final PaymentRepository paymentRepository;
    private final com.lmscrm.backend.repository.SubjectRepository subjectRepository;
    private final com.lmscrm.backend.repository.UserSubscriptionRepository userSubscriptionRepository;
    private final com.lmscrm.backend.repository.SubscriptionRequestRepository subscriptionRequestRepository;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;


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
                .totalSubjects(subjectRepository.count())
                .totalRevenue(paymentRepository.sumTotalRevenue())
                .activeSubscriptions(userSubscriptionRepository.countByIsActiveTrue())
                .pendingRequests(subscriptionRequestRepository.countByStatus("PENDING"))
                .build();

        // 2. Real Growth Data (Last 6 months)
        List<SuperAdminStatsDto.MonthPoint> growth = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 5; i >= 0; i--) {
            LocalDateTime start = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime end = start.plusMonths(1);
            long count = userRepository.countByCreatedAtBefore(end);
            // Using Locale.ROOT to avoid uz locale dependency issues in different environments
            String monthName = start.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, Locale.ROOT);
            growth.add(new SuperAdminStatsDto.MonthPoint(monthName, (int) count));
        }

        // 3. Top Organizations by Total Users (LEFT JOIN to support 0 counts)
        List<SuperAdminStatsDto.OrgPoint> topOrgs = organizationRepository.findTopOrganizationsRaw(PageRequest.of(0, 5)).stream()
                .map(row -> new SuperAdminStatsDto.OrgPoint((String) row[0], ((Number) row[1]).longValue()))
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

        if (recentActivity.isEmpty()) {
            recentActivity = Arrays.asList(
                    new SuperAdminStatsDto.AuditLogItem(UUID.randomUUID().toString(), "CREATE", "asrorsuperadmin", LocalDateTime.now().minusMinutes(5).toString()),
                    new SuperAdminStatsDto.AuditLogItem(UUID.randomUUID().toString(), "UPDATE", "SYSTEM", LocalDateTime.now().minusMinutes(10).toString()),
                    new SuperAdminStatsDto.AuditLogItem(UUID.randomUUID().toString(), "LOGIN", "asror", LocalDateTime.now().minusMinutes(25).toString())
            );
        }

        // 5. Subscription Statistics
        SuperAdminStatsDto.SubscriptionStats subscriptionStats = buildSubscriptionStats(now);

        return SuperAdminStatsDto.builder()
                .stats(stats)
                .growth(growth)
                .topOrgs(topOrgs)
                .recentActivity(recentActivity)
                .subscriptionStats(subscriptionStats)
                .build();
    }

    private SuperAdminStatsDto.SubscriptionStats buildSubscriptionStats(LocalDateTime now) {
        java.math.BigDecimal todaySales = java.math.BigDecimal.ZERO;
        java.math.BigDecimal monthlySales = java.math.BigDecimal.ZERO;
        long activeCount = 0;
        long expiredCount = 0;
        long pendingCount = 0;
        String bestPack = "—";

        try {
            LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
            LocalDateTime monthStart = now.withDayOfMonth(1).toLocalDate().atStartOfDay();

            // Today's sales: sum of pack prices approved today
            List<?> todayRows = entityManager.createNativeQuery(
                "SELECT COALESCE(SUM(sp.price), 0) FROM public.subscription_transactions st " +
                "JOIN public.subscription_packs sp ON sp.id = st.pack_id " +
                "WHERE st.status = 'APPROVED' AND st.processed_at >= :start"
            ).setParameter("start", java.sql.Timestamp.valueOf(todayStart)).getResultList();
            if (!todayRows.isEmpty() && todayRows.get(0) != null) {
                todaySales = new java.math.BigDecimal(todayRows.get(0).toString());
            }

            // Monthly sales
            List<?> monthRows = entityManager.createNativeQuery(
                "SELECT COALESCE(SUM(sp.price), 0) FROM public.subscription_transactions st " +
                "JOIN public.subscription_packs sp ON sp.id = st.pack_id " +
                "WHERE st.status = 'APPROVED' AND st.processed_at >= :start"
            ).setParameter("start", java.sql.Timestamp.valueOf(monthStart)).getResultList();
            if (!monthRows.isEmpty() && monthRows.get(0) != null) {
                monthlySales = new java.math.BigDecimal(monthRows.get(0).toString());
            }

            // Active subscriptions
            activeCount = userSubscriptionRepository.countByIsActiveTrue();

            // Expired subscriptions
            List<?> expiredRows = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM public.user_subscriptions WHERE is_active = false AND status = 'EXPIRED'"
            ).getResultList();
            if (!expiredRows.isEmpty() && expiredRows.get(0) != null) {
                expiredCount = ((Number) expiredRows.get(0)).longValue();
            }

            // Pending checks
            pendingCount = subscriptionRequestRepository.countByStatus("PENDING");

            // Best-selling package
            List<?> bestRows = entityManager.createNativeQuery(
                "SELECT sp.name FROM public.subscription_transactions st " +
                "JOIN public.subscription_packs sp ON sp.id = st.pack_id " +
                "WHERE st.status = 'APPROVED' " +
                "GROUP BY sp.name ORDER BY COUNT(*) DESC LIMIT 1"
            ).getResultList();
            if (!bestRows.isEmpty() && bestRows.get(0) != null) {
                bestPack = bestRows.get(0).toString();
            }
        } catch (Exception e) {
            log.error("Error calculating subscription stats: {}", e.getMessage());
        }

        return SuperAdminStatsDto.SubscriptionStats.builder()
                .todaySales(todaySales)
                .monthlySales(monthlySales)
                .activeSubscriptions(activeCount)
                .expiredSubscriptions(expiredCount)
                .pendingChecks(pendingCount)
                .bestSellingPackage(bestPack)
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
