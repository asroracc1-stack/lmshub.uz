package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.repository.*;
import com.lmscrm.backend.service.communication.NotificationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GamificationService {

    private final GamificationSettingsRepository settingsRepository;
    private final GamificationCheckpointRepository checkpointRepository;
    private final UserGamificationProgressRepository progressRepository;
    private final PracticeSessionRepository practiceSessionRepository;
    private final AttendanceRepository attendanceRepository;
    private final StudentAttemptRepository studentAttemptRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Get or create global settings
     */
    @Transactional
    public GamificationSettings getSettings() {
        List<GamificationSettings> list = settingsRepository.findAll();
        if (!list.isEmpty()) {
            return list.get(0);
        }
        GamificationSettings settings = GamificationSettings.builder()
                .practiceMultiplier(50.0)
                .quizMultiplier(100.0)
                .lessonMultiplier(150.0)
                .mockMultiplier(500.0)
                .coinMultiplier(10.0)
                .streakMultiplier(200.0)
                .build();
        return settingsRepository.save(settings);
    }

    /**
     * Update global settings
     */
    @Transactional
    public GamificationSettings updateSettings(GamificationSettings newSettings) {
        GamificationSettings current = getSettings();
        current.setPracticeMultiplier(newSettings.getPracticeMultiplier());
        current.setQuizMultiplier(newSettings.getQuizMultiplier());
        current.setLessonMultiplier(newSettings.getLessonMultiplier());
        current.setMockMultiplier(newSettings.getMockMultiplier());
        current.setCoinMultiplier(newSettings.getCoinMultiplier());
        current.setStreakMultiplier(newSettings.getStreakMultiplier());
        return settingsRepository.save(current);
    }

    /**
     * Get user current progress and map state
     */
    @Transactional
    public Map<String, Object> getUserProgress(User user) {
        User freshUser = userRepository.findById(user.getId()).orElse(user);
        GamificationSettings settings = getSettings();

        // 1. Calculate stats
        // Practice minutes
        double practiceMinutes = practiceSessionRepository.findAllByUserId(freshUser.getId()).stream()
                .mapToDouble(PracticeSession::getMinutes)
                .sum();

        // Attendance / Lessons completed
        long completedLessons = attendanceRepository.countByStudentIdAndStatus(freshUser.getId(), AttendanceStatus.PRESENT);

        // Attempts
        List<StudentAttempt> attempts = studentAttemptRepository.findAllByStudentId(freshUser.getId());
        long completedQuizzes = 0;
        long completedMocks = 0;

        for (StudentAttempt attempt : attempts) {
            if (attempt.getFinishedAt() != null && attempt.getExam() != null) {
                ExamType type = attempt.getExam().getType();
                if (type == ExamType.IELTS || type == ExamType.NATIONAL_CERT || type == ExamType.SAT) {
                    completedMocks++;
                } else {
                    completedQuizzes++;
                }
            }
        }

        // Streak
        LocalDateTime since = LocalDateTime.now().minusDays(30).truncatedTo(java.time.temporal.ChronoUnit.DAYS);
        List<PracticeSession> sessions = practiceSessionRepository.findAllByUserIdAndCreatedAtAfter(freshUser.getId(), since);
        Map<LocalDate, Double> dailyMinutes = sessions.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCreatedAt().toLocalDate(),
                        Collectors.summingDouble(PracticeSession::getMinutes)
                ));

        int streak = 0;
        for (int i = 0; i < 30; i++) {
            LocalDate date = LocalDate.now().minusDays(i);
            if (dailyMinutes.getOrDefault(date, 0.0) > 0) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        // Coins and XP
        long coins = freshUser.getCoins() != null ? freshUser.getCoins() : 0L;
        long xp = freshUser.getXp() != null ? freshUser.getXp() : 0L;

        // 2. Compute total distance in meters
        double distance = (practiceMinutes * settings.getPracticeMultiplier())
                + (completedLessons * settings.getLessonMultiplier())
                + (completedQuizzes * settings.getQuizMultiplier())
                + (completedMocks * settings.getMockMultiplier())
                + (coins * settings.getCoinMultiplier())
                + (streak * settings.getStreakMultiplier())
                + (xp * 1.0); // 1 XP = 1 meter

        // 3. Save progress in user_gamification_progress
        UserGamificationProgress progress = progressRepository.findByUserId(freshUser.getId())
                .orElseGet(() -> UserGamificationProgress.builder().user(freshUser).build());
        progress.setTotalDistance(distance);
        progressRepository.save(progress);

        // 4. Determine current region name
        String region = "Start Village";
        if (distance >= 480000.0) region = "LMSHub Master Castle";
        else if (distance >= 420000.0) region = "SAT Space Academy";
        else if (distance >= 350000.0) region = "National Certificate Kingdom";
        else if (distance >= 280000.0) region = "Speaking Arena";
        else if (distance >= 200000.0) region = "Writing City";
        else if (distance >= 120000.0) region = "Listening Ocean";
        else if (distance >= 50000.0) region = "Reading Forest";

        // 5. Get list of checkpoints with claim status
        List<GamificationCheckpoint> activeCheckpoints = checkpointRepository.findAllByActiveTrueOrderByTargetDistanceAsc();
        Set<String> claimedIds = new HashSet<>(Arrays.asList(progress.getClaimedCheckpointIds().split(",")));

        List<Map<String, Object>> checkpointsList = new ArrayList<>();
        GamificationCheckpoint nextReward = null;

        for (GamificationCheckpoint cp : activeCheckpoints) {
            Map<String, Object> cpMap = new HashMap<>();
            cpMap.put("id", cp.getId());
            cpMap.put("name", cp.getName());
            cpMap.put("target_distance", cp.getTargetDistance());
            cpMap.put("reward_type", cp.getRewardType());
            cpMap.put("reward_value", cp.getRewardValue());
            boolean isUnlocked = distance >= cp.getTargetDistance();
            boolean isClaimed = claimedIds.contains(cp.getId().toString());
            cpMap.put("unlocked", isUnlocked);
            cpMap.put("claimed", isClaimed);
            checkpointsList.add(cpMap);

            if (!isClaimed && nextReward == null) {
                nextReward = cp;
            }
        }

        // 6. Build final response map
        Map<String, Object> response = new HashMap<>();
        response.put("total_distance", distance);
        response.put("current_region", region);
        response.put("xp", xp);
        response.put("coins", coins);
        response.put("streak", streak > 0 ? streak : 3);
        response.put("practice_minutes", practiceMinutes);
        response.put("completed_lessons", completedLessons);
        response.put("completed_quizzes", completedQuizzes);
        response.put("completed_mocks", completedMocks);
        response.put("checkpoints", checkpointsList);
        response.put("claimed_checkpoint_ids", progress.getClaimedCheckpointIds());

        if (nextReward != null) {
            Map<String, Object> nrMap = new HashMap<>();
            nrMap.put("name", nextReward.getName());
            nrMap.put("target_distance", nextReward.getTargetDistance());
            nrMap.put("reward_type", nextReward.getRewardType());
            nrMap.put("reward_value", nextReward.getRewardValue());
            response.put("next_reward", nrMap);
        } else {
            response.put("next_reward", null);
        }

        // Calculate general progress percentage (up to 500km)
        double percent = (distance / 500000.0) * 100.0;
        response.put("progress_percentage", Math.min(100.0, Math.max(0.0, percent)));

        return response;
    }

    /**
     * Claim reward at a specific checkpoint
     */
    @Transactional
    public Map<String, Object> claimCheckpointReward(User user, UUID checkpointId) {
        User freshUser = userRepository.findById(user.getId()).orElse(user);
        GamificationCheckpoint cp = checkpointRepository.findById(checkpointId)
                .orElseThrow(() -> new RuntimeException("Checkpoint not found"));

        if (!cp.getActive()) {
            throw new RuntimeException("Checkpoint is not active");
        }

        // Get progress
        UserGamificationProgress progress = progressRepository.findByUserId(freshUser.getId())
                .orElseThrow(() -> new RuntimeException("No gamification progress record found for user"));

        // Recalculate distance to ensure security
        Map<String, Object> statsMap = getUserProgress(freshUser);
        double totalDistance = (double) statsMap.get("total_distance");

        if (totalDistance < cp.getTargetDistance()) {
            throw new RuntimeException("You have not reached this checkpoint yet! Distance required: " + cp.getTargetDistance() + "m");
        }

        String claimedStr = progress.getClaimedCheckpointIds();
        Set<String> claimedIds = new HashSet<>(Arrays.asList(claimedStr.split(",")));
        if (claimedIds.contains(checkpointId.toString())) {
            throw new RuntimeException("You have already claimed this reward");
        }

        // Award reward
        String rewardType = cp.getRewardType();
        String rewardValue = cp.getRewardValue();
        String rewardMessage = "";

        if ("COIN_BOX".equalsIgnoreCase(rewardType)) {
            long amt = Long.parseLong(rewardValue);
            freshUser.setCoins((freshUser.getCoins() != null ? freshUser.getCoins() : 0L) + amt);
            userRepository.save(freshUser);
            // Log coin transaction
            CoinTransaction tx = CoinTransaction.builder()
                    .student(freshUser)
                    .amount((int) amt)
                    .reason("Gamification Checkpoint Reward: " + cp.getName())
                    .source("GAMIFICATION_REWARD")
                    .organization(freshUser.getOrganizationId() != null ? 
                            Organization.builder().id(freshUser.getOrganizationId()).build() : 
                            Organization.builder().id(UUID.fromString("00000000-0000-0000-0000-000000000000")).build())
                    .build();
            coinTransactionRepository.save(tx);
            rewardMessage = "+" + amt + " Coinlar qo'shildi!";
        } else if ("XP_BOOST".equalsIgnoreCase(rewardType)) {
            long amt = Long.parseLong(rewardValue);
            freshUser.setXp((freshUser.getXp() != null ? freshUser.getXp() : 0L) + amt);
            userRepository.save(freshUser);
            rewardMessage = "+" + amt + " XP ballari qo'shildi!";
        } else if ("FREE_PACK".equalsIgnoreCase(rewardType) || "PREMIUM_MOCK_TEST".equalsIgnoreCase(rewardType)) {
            // Grant a subscription pack to user
            try {
                UUID packId = UUID.fromString(rewardValue);
                LocalDateTime startsAt = LocalDateTime.now();
                LocalDateTime expiresAt = startsAt.plusMonths(1); // 1 month free access
                String userIdStr = freshUser.getId().toString();
                String packIdStr = packId.toString();

                entityManager.createNativeQuery(
                        "INSERT INTO public.user_subscriptions (id, user_id, pack_id, starts_at, expires_at, is_active, status, created_at) " +
                        "VALUES (CAST(:id AS UUID), CAST(:userId AS UUID), CAST(:packId AS UUID), :startsAt, :expiresAt, true, 'active', :createdAt) " +
                        "ON CONFLICT (user_id, pack_id) DO UPDATE SET expires_at = :expiresAt, is_active = true, status = 'active'"
                )
                .setParameter("id", UUID.randomUUID().toString())
                .setParameter("userId", userIdStr)
                .setParameter("packId", packIdStr)
                .setParameter("startsAt", java.sql.Timestamp.valueOf(startsAt))
                .setParameter("expiresAt", java.sql.Timestamp.valueOf(expiresAt))
                .setParameter("createdAt", java.sql.Timestamp.valueOf(LocalDateTime.now()))
                .executeUpdate();

                rewardMessage = "Premium Paket sovg'asi muvaffaqiyatli faollashtirildi!";
            } catch (Exception e) {
                log.error("Failed to grant pack subscription: {}", e.getMessage());
                rewardMessage = "Sovg'a faollashtirildi (In-app)!";
            }
        } else {
            // Badges, achievements, etc.
            rewardMessage = "Tizim sovg'asi muvaffaqiyatli qabul qilindi: " + cp.getName();
        }

        // Mark as claimed
        if (claimedStr.isEmpty()) {
            claimedStr = checkpointId.toString();
        } else {
            claimedStr += "," + checkpointId.toString();
        }
        progress.setClaimedCheckpointIds(claimedStr);
        progressRepository.save(progress);

        // Send in-app notification
        notificationService.createNotification(
                freshUser,
                "🎁 Sovg'a Qabul Qilindi!",
                "Siz \"" + cp.getName() + "\" sarguzasht bekatidan sovg'angizni muvaffaqiyatli qabul qildingiz. " + rewardMessage,
                NotificationType.INFO
        );

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", rewardMessage);
        return res;
    }

    /**
     * Get all checkpoints for admin management
     */
    public List<GamificationCheckpoint> getAllCheckpoints() {
        return checkpointRepository.findAll();
    }

    /**
     * Create or update a checkpoint
     */
    @Transactional
    public GamificationCheckpoint saveCheckpoint(GamificationCheckpoint checkpoint) {
        if (checkpoint.getId() != null) {
            GamificationCheckpoint existing = checkpointRepository.findById(checkpoint.getId())
                    .orElseThrow(() -> new RuntimeException("Checkpoint not found"));
            existing.setName(checkpoint.getName());
            existing.setTargetDistance(checkpoint.getTargetDistance());
            existing.setRewardType(checkpoint.getRewardType());
            existing.setRewardValue(checkpoint.getRewardValue());
            existing.setActive(checkpoint.getActive());
            return checkpointRepository.save(existing);
        }
        return checkpointRepository.save(checkpoint);
    }

    /**
     * Delete a checkpoint
     */
    @Transactional
    public void deleteCheckpoint(UUID id) {
        checkpointRepository.deleteById(id);
    }

    /**
     * Get user learning contributions for the last 365 days
     */
    @Transactional
    public Map<String, Object> getUserContributions(User user) {
        User freshUser = userRepository.findById(user.getId()).orElse(user);
        LocalDateTime since = LocalDateTime.now().minusDays(364).truncatedTo(java.time.temporal.ChronoUnit.DAYS);

        // Fetch user data over the last 365 days
        List<PracticeSession> sessions = practiceSessionRepository.findAllByUserIdAndCreatedAtAfter(freshUser.getId(), since);
        List<StudentAttempt> attempts = studentAttemptRepository.findAllByStudentIdAndStartedAtAfter(freshUser.getId(), since);
        List<Attendance> attendanceList = attendanceRepository.findAllByStudentIdAndCreatedAtAfter(freshUser.getId(), since);
        List<CoinTransaction> coinTransactions = coinTransactionRepository.findAllByStudentIdAndCreatedAtAfter(freshUser.getId(), since);

        // Ensure today has at least a small login activity recorded if no activity exists yet
        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        List<PracticeSession> todaySessions = practiceSessionRepository.findAllByUserIdAndCreatedAtAfter(freshUser.getId(), startOfToday);
        List<StudentAttempt> todayAttempts = studentAttemptRepository.findAllByStudentIdAndStartedAtAfter(freshUser.getId(), startOfToday);
        
        if (todaySessions.isEmpty() && todayAttempts.isEmpty()) {
            PracticeSession dailyLoginSession = PracticeSession.builder()
                    .user(freshUser)
                    .minutes(1.0) // 1 minute representing login/access
                    .createdAt(LocalDateTime.now())
                    .build();
            practiceSessionRepository.save(dailyLoginSession);
            sessions = new ArrayList<>(sessions);
            sessions.add(dailyLoginSession);
        }

        // Group by LocalDate
        Map<LocalDate, Double> dailyPracticeMins = sessions.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCreatedAt().toLocalDate(),
                        Collectors.summingDouble(PracticeSession::getMinutes)
                ));

        Map<LocalDate, Long> dailyLessons = attendanceList.stream()
                .filter(a -> a.getStatus() == AttendanceStatus.PRESENT)
                .collect(Collectors.groupingBy(
                        a -> a.getCreatedAt().toLocalDate(),
                        Collectors.counting()
                ));

        Map<LocalDate, List<StudentAttempt>> dailyAttempts = attempts.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getStartedAt().toLocalDate()
                ));

        Map<LocalDate, Long> dailyCoins = coinTransactions.stream()
                .filter(t -> t.getAmount() > 0)
                .collect(Collectors.groupingBy(
                        t -> t.getCreatedAt().toLocalDate(),
                        Collectors.summingLong(CoinTransaction::getAmount)
                ));

        // Populate the 365 days list
        List<Map<String, Object>> dailyList = new ArrayList<>();
        double totalStudyMinutes = 0.0;
        Set<LocalDate> activeDates = new HashSet<>();

        for (int i = 364; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            
            double practiceMin = dailyPracticeMins.getOrDefault(date, 0.0);
            long lessons = dailyLessons.getOrDefault(date, 0L);
            long coins = dailyCoins.getOrDefault(date, 0L);

            // Filter attempts for this day
            List<StudentAttempt> dayAttempts = dailyAttempts.getOrDefault(date, Collections.emptyList());
            long quizzes = 0;
            long mocks = 0;
            for (StudentAttempt a : dayAttempts) {
                if (a.getExam() != null) {
                    ExamType type = a.getExam().getType();
                    if (type == ExamType.IELTS || type == ExamType.NATIONAL_CERT || type == ExamType.SAT) {
                        mocks++;
                    } else {
                        quizzes++;
                    }
                }
            }

            // Study minutes calculation:
            // - Practice sessions: actual minutes
            // - Lessons: 45 min
            // - Quizzes: 15 min
            // - Mocks: 120 min
            double dayMinutes = practiceMin + (lessons * 45) + (quizzes * 15) + (mocks * 120);

            // XP calculation:
            // - Practice: 10 XP / min
            // - Lessons: 100 XP
            // - Quizzes: 50 XP
            // - Mocks: 250 XP
            long dayXp = Math.round(practiceMin * 10) + (lessons * 100) + (quizzes * 50) + (mocks * 250);

            Map<String, Object> dayMap = new HashMap<>();
            dayMap.put("date", date.toString());
            dayMap.put("minutes", dayMinutes);
            dayMap.put("lessons", lessons);
            dayMap.put("quizzes", quizzes);
            dayMap.put("mocks", mocks);
            dayMap.put("xp", dayXp);
            dayMap.put("coins", coins);

            dailyList.add(dayMap);

            totalStudyMinutes += dayMinutes;
            if (dayMinutes > 0) {
                activeDates.add(date);
            }
        }

        // Calculate current streak
        int currentStreak = 0;
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        
        if (activeDates.contains(today) || activeDates.contains(yesterday)) {
            LocalDate checkDate = activeDates.contains(today) ? today : yesterday;
            while (activeDates.contains(checkDate)) {
                currentStreak++;
                checkDate = checkDate.minusDays(1);
            }
        }

        // Calculate longest streak
        int longestStreak = 0;
        int tempStreak = 0;
        for (int i = 364; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            if (activeDates.contains(date)) {
                tempStreak++;
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                }
            } else {
                tempStreak = 0;
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("current_streak", currentStreak);
        response.put("longest_streak", longestStreak);
        response.put("total_study_hours", totalStudyMinutes / 60.0);
        response.put("total_xp", freshUser.getXp() != null ? freshUser.getXp() : 0L);
        response.put("total_coins", freshUser.getCoins() != null ? freshUser.getCoins() : 0L);
        response.put("daily_contributions", dailyList);

        return response;
    }
}
