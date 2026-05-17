package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.admin.LeaderboardDto;
import com.lmscrm.backend.repository.CoinTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final CoinTransactionRepository coinTransactionRepository;

    public List<LeaderboardDto> getLeaderboard(String period, String role, boolean isGlobal) {
        AppRole appRole;
        try {
            appRole = AppRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            appRole = AppRole.STUDENT;
        }
        LocalDateTime startDate = calculateStartDate(period);

        List<Object[]> results;
        if (isGlobal) {
            if (startDate != null) {
                results = coinTransactionRepository.getGlobalLeaderboardByRoleAndDateAfter(appRole, startDate);
            } else {
                results = coinTransactionRepository.getGlobalLeaderboardByRole(appRole);
            }
        } else {
            if (startDate != null) {
                results = coinTransactionRepository.getLeaderboardByRoleAndDateAfter(appRole, startDate);
            } else {
                results = coinTransactionRepository.getLeaderboardByRole(appRole);
            }
        }

        return mapResults(results);
    }

    public List<LeaderboardDto> getRegularUsersLeaderboard(String period, int limit) {
        LocalDateTime startDate = calculateStartDate(period);
        AppRole role = AppRole.USER; // Regular users typically have ROLE_USER

        List<Object[]> results;
        if (startDate != null) {
            results = coinTransactionRepository.getGlobalLeaderboardByRoleAndDateAfter(role, startDate);
        } else {
            results = coinTransactionRepository.getGlobalLeaderboardByRole(role);
        }

        return mapResults(results).stream()
                .limit(limit)
                .collect(Collectors.toList());
    }

    private LocalDateTime calculateStartDate(String period) {
        if (period == null) return null;
        LocalDateTime now = LocalDateTime.now();
        switch (period.toLowerCase()) {
            case "week": case "weekly": return now.minusWeeks(1);
            case "month": case "monthly": return now.minusMonths(1);
            case "6month": return now.minusMonths(6);
            case "year": case "yearly": return now.minusYears(1);
            default: return null;
        }
    }

    private List<LeaderboardDto> mapResults(List<Object[]> results) {
        if (results == null) return java.util.Collections.emptyList();
        
        java.util.concurrent.atomic.AtomicInteger rank = new java.util.concurrent.atomic.AtomicInteger(1);
        return results.stream().map(row -> {
            User user = (User) row[0];
            Long totalCoins = (Long) row[1];
            return LeaderboardDto.builder()
                    .id(user.getId())
                    .fullName(user.getFullName())
                    .username(user.getUsername())
                    .avatarUrl(user.getAvatarUrl())
                    .coins(totalCoins)
                    .rank(rank.getAndIncrement())
                    .build();
        }).collect(Collectors.toList());
    }
}
