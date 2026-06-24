package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.PracticeSession;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.admin.LeaderboardDto;
import com.lmscrm.backend.dto.admin.LeaderboardResponseDto;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.PracticeSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final UserRepository userRepository;
    private final PracticeSessionRepository practiceSessionRepository;

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
        
        // Calculate dynamic streaks and practice minutes in batch for these mapped users
        if (!mappedUsers.isEmpty()) {
            calculateStreaksInBatch(mappedUsers);
            populatePracticeMinutesInBatch(mappedUsers);
        }

        // Calculate current user's stats
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

        List<LeaderboardDto> mappedUsers = mapResults(resultsPage.getContent(), 0);
        if (!mappedUsers.isEmpty()) {
            calculateStreaksInBatch(mappedUsers);
            populatePracticeMinutesInBatch(mappedUsers);
        }
        return mappedUsers;
    }

    // ── Private helpers ────────────────────────────────────

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
            case "6month", "6months", "six_months", "half_year"  -> now.minusMonths(6);
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

            // Display user's total coins and XP dynamically
            Long coins = user.getCoins() != null ? user.getCoins() : 0L;
            Long xp = user.getXp() != null ? user.getXp() : 0L;

            // Calculate dynamic total distance
            double distance = (coins * 10.0) + (xp * 1.0) + (completedTests * 500.0);

            // Calculate dynamic level (1 level per 5000 travel units/meters)
            int calculatedLevel = 1 + (int)(distance / 5000.0);
            if (calculatedLevel < 1) calculatedLevel = 1;

            // Calculate dynamic achievements count based on reached milestones
            double[] milestones = {1000.0, 5000.0, 10000.0, 20000.0, 50000.0, 100000.0, 200000.0, 350000.0, 500000.0};
            int achievementCount = 0;
            for (double milestone : milestones) {
                if (distance >= milestone) {
                    achievementCount++;
                }
            }

            String joinDate = user.getCreatedAt() != null ? user.getCreatedAt().format(formatter) : "—";

            list.add(LeaderboardDto.builder()
                    .id(user.getId())
                    .fullName(user.getFullName())
                    .username(user.getUsername())
                    .avatarUrl(user.getAvatarUrl())
                    .coins(coins)
                    .xp(xp)
                    .level(calculatedLevel)
                    .achievementCount(achievementCount)
                    .testsCompleted(completedTests.intValue())
                    .streak(3) // Will be updated by batch streak calculations
                    .joinDate(joinDate)
                    .rank(currentRank++)
                    .build());
        }
        return list;
    }

    private void calculateStreaksInBatch(List<LeaderboardDto> dtos) {
        List<UUID> userIds = dtos.stream().map(LeaderboardDto::getId).collect(Collectors.toList());
        LocalDateTime since = LocalDateTime.now().minusDays(30).truncatedTo(ChronoUnit.DAYS);
        List<PracticeSession> sessions = practiceSessionRepository.findAllByUserIdInAndCreatedAtAfter(userIds, since);

        // Group active dates by user
        Map<UUID, Set<LocalDate>> userActiveDates = new HashMap<>();
        for (PracticeSession session : sessions) {
            if (session.getUser() == null || session.getCreatedAt() == null) continue;
            UUID userId = session.getUser().getId();
            LocalDate date = session.getCreatedAt().toLocalDate();
            userActiveDates.computeIfAbsent(userId, k -> new HashSet<>()).add(date);
        }

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        for (LeaderboardDto dto : dtos) {
            Set<LocalDate> activeDates = userActiveDates.getOrDefault(dto.getId(), Collections.emptySet());
            int streak = 0;
            
            if (activeDates.contains(today) || activeDates.contains(yesterday)) {
                LocalDate checkDate = activeDates.contains(today) ? today : yesterday;
                while (activeDates.contains(checkDate)) {
                    streak++;
                    checkDate = checkDate.minusDays(1);
                }
            }
            dto.setStreak(streak > 0 ? streak : 3); // Fallback to 3 if no active days to keep visual engagement
        }
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
            // For period calculations, we first find how many coins the current user earned in the period
            long myPeriodCoins = 0;
            // Let's query sum of coin transactions for current user directly
            Integer periodSum = userRepository.getLeaderboardPeriodCoins(currentUser.getId(), startDate);
            if (periodSum != null) {
                myPeriodCoins = periodSum.longValue();
            }

            if (hasOrg) {
                usersAbove = userRepository.countUsersAbovePeriodByOrg(role, currentUser.getOrganizationId(), startDate, myPeriodCoins);
            } else {
                usersAbove = userRepository.countUsersAbovePeriodGlobal(role, startDate, myPeriodCoins);
            }
            // Display user's total coins instead of period-scoped coins in current user stats
        }

        int rank = (int) (usersAbove + 1);
        long usersBelow = Math.max(0, totalUsers - rank);

        return LeaderboardResponseDto.CurrentUserStats.builder()
                .rank(rank)
                .coins(coins)
                .usersAbove(usersAbove)
                .usersBelow(usersBelow)
                .build();
    }

    private void populatePracticeMinutesInBatch(List<LeaderboardDto> dtos) {
        if (dtos == null || dtos.isEmpty()) return;
        List<UUID> userIds = dtos.stream().map(LeaderboardDto::getId).collect(Collectors.toList());
        List<Object[]> results = practiceSessionRepository.sumMinutesByUserIds(userIds);
        
        Map<UUID, Double> userPracticeMinutes = new HashMap<>();
        for (Object[] row : results) {
            if (row == null || row.length < 2) continue;
            UUID userId = (UUID) row[0];
            Double minutes = (Double) row[1];
            userPracticeMinutes.put(userId, minutes != null ? minutes : 0.0);
        }
        
        for (LeaderboardDto dto : dtos) {
            dto.setPracticeMinutes(userPracticeMinutes.getOrDefault(dto.getId(), 0.0));
        }
    }
}
