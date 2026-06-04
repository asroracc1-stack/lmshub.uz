package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.admin.LeaderboardDto;
import com.lmscrm.backend.repository.CoinTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final CoinTransactionRepository coinTransactionRepository;

    /**
     * Main leaderboard method.
     * - USER role: shows all USER-role users globally (no org filter)
     * - Other roles (STUDENT/TEACHER): filters by current user's organization if available
     * - isGlobal=true: shows all users of that role regardless of organization
     */
    public List<LeaderboardDto> getLeaderboard(User currentUser, String period, String role, boolean isGlobal) {
        AppRole appRole = parseRole(role);

        // Enforce: USER role users can only see USER leaderboard
        if (currentUser.getRole() == AppRole.USER) {
            appRole = AppRole.USER;
        }

        LocalDateTime startDate = calculateStartDate(period);
        List<Object[]> results;

        if (appRole == AppRole.USER) {
            // Independent users: show all USER-role globally (no org restriction)
            results = fetchByRole(appRole, startDate);

        } else if (isGlobal || currentUser.getOrganizationId() == null) {
            // No org context: show all users of this role globally
            results = fetchByRole(appRole, startDate);

        } else {
            // Has org: filter by organization
            results = fetchByRoleAndOrg(appRole, currentUser.getOrganizationId(), startDate);
        }

        return mapResults(results);
    }

    public List<LeaderboardDto> getRegularUsersLeaderboard(String period, int limit) {
        LocalDateTime startDate = calculateStartDate(period);
        List<Object[]> results = fetchByRole(AppRole.USER, startDate);
        return mapResults(results).stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    // ── Private helpers ────────────────────────────────────

    private AppRole parseRole(String role) {
        try {
            return AppRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return AppRole.STUDENT;
        }
    }

    private List<Object[]> fetchByRole(AppRole role, LocalDateTime startDate) {
        if (startDate != null) {
            return coinTransactionRepository.getLeaderboardByRoleAndDateAfter(role, startDate);
        }
        return coinTransactionRepository.getLeaderboardByRole(role);
    }

    private List<Object[]> fetchByRoleAndOrg(AppRole role, java.util.UUID orgId, LocalDateTime startDate) {
        if (startDate != null) {
            return coinTransactionRepository.getLeaderboardByRoleAndOrganizationAndDateAfter(role, orgId, startDate);
        }
        return coinTransactionRepository.getLeaderboardByRoleAndOrganization(role, orgId);
    }

    private LocalDateTime calculateStartDate(String period) {
        if (period == null) return null;
        LocalDateTime now = LocalDateTime.now();
        return switch (period.toLowerCase()) {
            case "day", "daily", "today"                         -> now.minusDays(1);
            case "week", "weekly"                                -> now.minusWeeks(1);
            case "month", "monthly"                              -> now.minusMonths(1);
            case "6month", "6months", "six_months", "half_year"  -> now.minusMonths(6);
            case "year", "yearly"                                -> now.minusYears(1);
            default                                              -> null;
        };
    }

    private List<LeaderboardDto> mapResults(List<Object[]> results) {
        if (results == null || results.isEmpty()) return Collections.emptyList();
        AtomicInteger rank = new AtomicInteger(1);
        return results.stream()
                .filter(row -> row != null && row[0] instanceof User)
                .map(row -> {
                    User user = (User) row[0];
                    Long totalCoins = row[1] instanceof Long
                            ? (Long) row[1]
                            : row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L;
                    return LeaderboardDto.builder()
                            .id(user.getId())
                            .fullName(user.getFullName())
                            .username(user.getUsername())
                            .avatarUrl(user.getAvatarUrl())
                            .coins(totalCoins)
                            .rank(rank.getAndIncrement())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
