package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.UserSubscription;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.admin.LeaderboardDto;
import com.lmscrm.backend.dto.admin.LeaderboardResponseDto;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardService {

    private final UserRepository userRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;

    public LeaderboardResponseDto getLeaderboard(User currentUser, String period, String role, boolean isGlobal, int page, int size) {
        AppRole appRole = parseRole(role);

        // Enforce: USER role users can only see USER leaderboard
        if (currentUser.getRole() == AppRole.USER) {
            appRole = AppRole.USER;
        }

        LocalDateTime startDate = calculateStartDate(period);
        Pageable pageable = PageRequest.of(page, size);
        Page<Object[]> resultsPage;

        boolean isAllTime = (startDate == null);
        boolean hasOrg = (!isGlobal && currentUser.getOrganizationId() != null && appRole != AppRole.USER);

        if (isAllTime) {
            if (hasOrg) {
                resultsPage = userRepository.getLeaderboardAllTimeByOrg(appRole, currentUser.getOrganizationId(), pageable);
            } else {
                resultsPage = userRepository.getLeaderboardAllTimeGlobal(appRole, pageable);
            }
        } else {
            if (hasOrg) {
                resultsPage = userRepository.getLeaderboardPeriodByOrg(appRole, currentUser.getOrganizationId(), startDate, pageable);
            } else {
                resultsPage = userRepository.getLeaderboardPeriodGlobal(appRole, startDate, pageable);
            }
        }

        List<LeaderboardDto> mappedUsers = mapResults(resultsPage.getContent(), page * size);

        // Determine user subscription B2C tier
        String userTier = "FREE";
        if (currentUser.getRole() == AppRole.SUPER_ADMIN || currentUser.getRole() == AppRole.ADMIN) {
            userTier = "ELITE";
        } else {
            Optional<UserSubscription> subOpt = userSubscriptionRepository.findFirstByUserIdAndIsActiveTrueOrderByExpiresAtDesc(currentUser.getId());
            if (subOpt.isPresent()) {
                UserSubscription sub = subOpt.get();
                if (sub.getExpiresAt() == null || sub.getExpiresAt().isAfter(LocalDateTime.now())) {
                    userTier = sub.getPack().getType().name(); // PRO or ELITE
                }
            }
        }

        // Apply B2C Subscription limits on Leaderboard rows (Free: top 10, Pro: top 100, Elite: unlimited)
        for (LeaderboardDto dto : mappedUsers) {
            boolean isOwnRow = dto.getId().equals(currentUser.getId());
            if (isOwnRow) continue; // Do not mask the user themselves

            int limit = 10;
            if (userTier.equalsIgnoreCase("PRO")) {
                limit = 100;
            } else if (userTier.equalsIgnoreCase("ELITE")) {
                limit = Integer.MAX_VALUE;
            }

            if (dto.getRank() > limit) {
                dto.setFullName("Premium User");
                dto.setUsername("premium_user");
                dto.setAvatarUrl(null);
            }
        }

        // Calculate current user stats
        LeaderboardResponseDto.CurrentUserStats userStats = calculateCurrentUserStats(currentUser, appRole, hasOrg, isAllTime, startDate);

        return LeaderboardResponseDto.builder()
                .users(mappedUsers)
                .currentUserStats(userStats)
                .totalPages(resultsPage.getTotalPages())
                .totalElements(resultsPage.getTotalElements())
                .build();
    }

    public List<LeaderboardDto> getRegularUsersLeaderboard(String period, int limit) {
        LocalDateTime startDate = calculateStartDate(period);
        Pageable pageable = PageRequest.of(0, limit);
        Page<Object[]> resultsPage;

        if (startDate == null) {
            resultsPage = userRepository.getLeaderboardAllTimeGlobal(AppRole.USER, pageable);
        } else {
            resultsPage = userRepository.getLeaderboardPeriodGlobal(AppRole.USER, startDate, pageable);
        }

        return mapResults(resultsPage.getContent(), 0);
    }

    private AppRole parseRole(String role) {
        try {
            return AppRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return AppRole.STUDENT;
        }
    }

    private LocalDateTime calculateStartDate(String period) {
        if (period == null) return null;
        LocalDateTime now = LocalDateTime.now();
        return switch (period.toLowerCase()) {
            case "day", "daily", "today"                         -> now.minusDays(1);
            case "week", "weekly", "week_time"                   -> now.minusWeeks(1);
            case "month", "monthly"                              -> now.minusMonths(1);
            case "year", "yearly"                                -> now.minusYears(1);
            default                                              -> null;
        };
    }

    private List<LeaderboardDto> mapResults(List<Object[]> results, int offset) {
        if (results == null || results.isEmpty()) return Collections.emptyList();

        List<LeaderboardDto> list = new ArrayList<>();
        int currentRank = offset + 1;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");

        for (Object[] row : results) {
            if (row == null || row.length < 4 || !(row[0] instanceof User)) continue;

            User user = (User) row[0];
            Long completedTests = (Long) row[3];

            // For period queries, row[4] is periodCoins and row[5] is periodXp
            Long coins = (row.length > 4 && row[4] != null) ? (Long) row[4] : (user.getCoins() != null ? user.getCoins() : 0L);
            Long xp = (row.length > 5 && row[5] != null) ? (Long) row[5] : (user.getXp() != null ? user.getXp() : 0L);

            // Level formula: 1 + totalXp / 100
            Long totalXp = user.getXp() != null ? user.getXp() : 0L;
            int calculatedLevel = 1 + (int)(totalXp / 100.0);
            if (calculatedLevel < 1) calculatedLevel = 1;

            String joinDate = user.getCreatedAt() != null ? user.getCreatedAt().format(formatter) : "—";
            int streak = user.getCurrentStreak() != null ? user.getCurrentStreak() : 3;

            list.add(LeaderboardDto.builder()
                    .id(user.getId())
                    .fullName(user.getFullName())
                    .username(user.getUsername())
                    .avatarUrl(user.getAvatarUrl())
                    .coins(coins)
                    .xp(xp)
                    .level(calculatedLevel)
                    .achievementCount(0)
                    .testsCompleted(completedTests.intValue())
                    .streak(streak)
                    .joinDate(joinDate)
                    .rank(currentRank++)
                    .practiceMinutes(0.0)
                    .build());
        }
        return list;
    }

    private LeaderboardResponseDto.CurrentUserStats calculateCurrentUserStats(
            User currentUser, AppRole role, boolean hasOrg, boolean isAllTime, LocalDateTime startDate) {

        long totalUsers = hasOrg
                ? userRepository.countByRoleAndOrganizationIdAndActive(role, currentUser.getOrganizationId(), true)
                : userRepository.countByRoleAndActive(role, true);

        long usersAbove = 0;
        Long coins = currentUser.getCoins() != null ? currentUser.getCoins() : 0L;
        Long xp = currentUser.getXp() != null ? currentUser.getXp() : 0L;

        if (isAllTime) {
            if (hasOrg) {
                usersAbove = userRepository.countUsersAboveAllTimeByOrg(role, currentUser.getOrganizationId(), coins, xp, currentUser.getCreatedAt());
            } else {
                usersAbove = userRepository.countUsersAboveAllTimeGlobal(role, coins, xp, currentUser.getCreatedAt());
            }
        } else {
            long myPeriodCoins = 0;
            Integer periodSum = userRepository.getLeaderboardPeriodCoins(currentUser.getId(), startDate);
            if (periodSum != null) {
                myPeriodCoins = periodSum.longValue();
            }

            if (hasOrg) {
                usersAbove = userRepository.countUsersAbovePeriodByOrg(role, currentUser.getOrganizationId(), startDate, myPeriodCoins);
            } else {
                usersAbove = userRepository.countUsersAbovePeriodGlobal(role, startDate, myPeriodCoins);
            }
        }

        int rank = (int) (usersAbove + 1);
        long usersBelow = Math.max(0, totalUsers - rank);

        return LeaderboardResponseDto.CurrentUserStats.builder()
                .rank(rank)
                .coins(isAllTime ? coins : (userRepository.getLeaderboardPeriodCoins(currentUser.getId(), startDate) != null ? userRepository.getLeaderboardPeriodCoins(currentUser.getId(), startDate).longValue() : 0L))
                .usersAbove(usersAbove)
                .usersBelow(usersBelow)
                .build();
    }
}
