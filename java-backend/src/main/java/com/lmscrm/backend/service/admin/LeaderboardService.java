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

    public LeaderboardResponseDto getLeaderboard(User currentUser, String metric, String role, boolean isGlobal, int page, int size) {
        AppRole appRole = parseRole(role);

        // Enforce: USER role users can only see USER leaderboard
        if (currentUser.getRole() == AppRole.USER) {
            appRole = AppRole.USER;
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Object[]> resultsPage;

        boolean hasOrg = (!isGlobal && currentUser.getOrganizationId() != null && appRole != AppRole.USER);

        if ("stars".equalsIgnoreCase(metric)) {
            if (hasOrg) {
                resultsPage = userRepository.getLeaderboardByStarsByOrg(appRole, currentUser.getOrganizationId(), pageable);
            } else {
                resultsPage = userRepository.getLeaderboardByStarsGlobal(appRole, pageable);
            }
        } else if ("practice_time".equalsIgnoreCase(metric)) {
            if (hasOrg) {
                resultsPage = userRepository.getLeaderboardByPracticeByOrg(appRole, currentUser.getOrganizationId(), pageable);
            } else {
                resultsPage = userRepository.getLeaderboardByPracticeGlobal(appRole, pageable);
            }
        } else if ("streak".equalsIgnoreCase(metric)) {
            if (hasOrg) {
                resultsPage = userRepository.getLeaderboardByStreakByOrg(appRole, currentUser.getOrganizationId(), pageable);
            } else {
                resultsPage = userRepository.getLeaderboardByStreakGlobal(appRole, pageable);
            }
        } else { // coins
            if (hasOrg) {
                resultsPage = userRepository.getLeaderboardByCoinsByOrg(appRole, currentUser.getOrganizationId(), pageable);
            } else {
                resultsPage = userRepository.getLeaderboardByCoinsGlobal(appRole, pageable);
            }
        }

        List<LeaderboardDto> mappedUsers = mapResults(resultsPage.getContent(), page * size, metric);

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
        LeaderboardResponseDto.CurrentUserStats userStats = calculateCurrentUserStats(currentUser, appRole, hasOrg, metric);

        return LeaderboardResponseDto.builder()
                .users(mappedUsers)
                .currentUserStats(userStats)
                .totalPages(resultsPage.getTotalPages())
                .totalElements(resultsPage.getTotalElements())
                .build();
    }

    public List<LeaderboardDto> getRegularUsersLeaderboard(String metric, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        Page<Object[]> resultsPage;

        if ("stars".equalsIgnoreCase(metric)) {
            resultsPage = userRepository.getLeaderboardByStarsGlobal(AppRole.USER, pageable);
        } else if ("practice_time".equalsIgnoreCase(metric)) {
            resultsPage = userRepository.getLeaderboardByPracticeGlobal(AppRole.USER, pageable);
        } else if ("streak".equalsIgnoreCase(metric)) {
            resultsPage = userRepository.getLeaderboardByStreakGlobal(AppRole.USER, pageable);
        } else {
            resultsPage = userRepository.getLeaderboardByCoinsGlobal(AppRole.USER, pageable);
        }

        return mapResults(resultsPage.getContent(), 0, metric);
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

    private List<LeaderboardDto> mapResults(List<Object[]> results, int offset, String metric) {
        if (results == null || results.isEmpty()) return Collections.emptyList();

        List<LeaderboardDto> list = new ArrayList<>();
        int currentRank = offset + 1;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");

        for (Object[] row : results) {
            if (row == null || row.length < 2 || !(row[0] instanceof User)) continue;

            User user = (User) row[0];
            Long completedTests = (Long) row[1];

            Long coins = user.getCoins() != null ? user.getCoins() : 0L;
            Long xp = user.getXp() != null ? user.getXp() : 0L;

            Double practiceMinutes = 0.0;
            if ("practice_time".equalsIgnoreCase(metric) && row.length > 2 && row[2] != null) {
                practiceMinutes = (Double) row[2];
            } else {
                // otherwise set total minutes dynamically
                practiceMinutes = userRepository.getTotalPracticeMinutes(user.getId());
                if (practiceMinutes == null) practiceMinutes = 0.0;
            }

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
                    .practiceMinutes(practiceMinutes)
                    .build());
        }
        return list;
    }

    private LeaderboardResponseDto.CurrentUserStats calculateCurrentUserStats(
            User currentUser, AppRole role, boolean hasOrg, String metric) {

        long totalUsers = hasOrg
                ? userRepository.countByRoleAndOrganizationIdAndActive(role, currentUser.getOrganizationId(), true)
                : userRepository.countByRoleAndActive(role, true);

        long usersAbove = 0;
        Long coins = currentUser.getCoins() != null ? currentUser.getCoins() : 0L;
        Long xp = currentUser.getXp() != null ? currentUser.getXp() : 0L;
        Integer streak = currentUser.getCurrentStreak() != null ? currentUser.getCurrentStreak() : 3;
        LocalDateTime userCreatedAt = currentUser.getCreatedAt() != null ? currentUser.getCreatedAt() : LocalDateTime.now();

        if ("stars".equalsIgnoreCase(metric)) {
            if (hasOrg) {
                usersAbove = userRepository.countUsersAboveStarsByOrg(role, currentUser.getOrganizationId(), xp, userCreatedAt);
            } else {
                usersAbove = userRepository.countUsersAboveStarsGlobal(role, xp, userCreatedAt);
            }
        } else if ("practice_time".equalsIgnoreCase(metric)) {
            Double myPracticeMinutes = userRepository.getTotalPracticeMinutes(currentUser.getId());
            if (myPracticeMinutes == null) myPracticeMinutes = 0.0;

            if (hasOrg) {
                usersAbove = userRepository.countUsersAbovePracticeByOrg(role, currentUser.getOrganizationId(), myPracticeMinutes);
            } else {
                usersAbove = userRepository.countUsersAbovePracticeGlobal(role, myPracticeMinutes);
            }
        } else if ("streak".equalsIgnoreCase(metric)) {
            if (hasOrg) {
                usersAbove = userRepository.countUsersAboveStreakByOrg(role, currentUser.getOrganizationId(), streak, userCreatedAt);
            } else {
                usersAbove = userRepository.countUsersAboveStreakGlobal(role, streak, userCreatedAt);
            }
        } else { // coins
            if (hasOrg) {
                usersAbove = userRepository.countUsersAboveCoinsByOrg(role, currentUser.getOrganizationId(), coins, userCreatedAt);
            } else {
                usersAbove = userRepository.countUsersAboveCoinsGlobal(role, coins, userCreatedAt);
            }
        }

        int rank = (int) (usersAbove + 1);
        long usersBelow = Math.max(0, totalUsers - rank);

        long displayVal = 0;
        if ("stars".equalsIgnoreCase(metric)) {
            displayVal = xp;
        } else if ("practice_time".equalsIgnoreCase(metric)) {
            Double myPracticeMinutes = userRepository.getTotalPracticeMinutes(currentUser.getId());
            displayVal = Math.round(myPracticeMinutes != null ? myPracticeMinutes : 0.0);
        } else if ("streak".equalsIgnoreCase(metric)) {
            displayVal = streak;
        } else {
            displayVal = coins;
        }

        return LeaderboardResponseDto.CurrentUserStats.builder()
                .rank(rank)
                .coins(displayVal)
                .usersAbove(usersAbove)
                .usersBelow(usersBelow)
                .build();
    }
}
