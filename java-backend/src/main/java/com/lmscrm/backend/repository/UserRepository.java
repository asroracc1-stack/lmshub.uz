package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByEmailOrUsername(String email, String username);
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    Optional<User> findByTelegramChatId(String telegramChatId);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") AppRole role);

    long countByCreatedAtBefore(LocalDateTime date);
    
    long countByOrganizationId(UUID organizationId);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.organizationId = :orgId")
    long countByRoleAndOrganizationId(@Param("role") AppRole role, @Param("orgId") UUID orgId);
    
    long countByOrganizationIdAndRole(UUID organizationId, AppRole role);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.createdAt < :date")
    long countByRoleAndCreatedAtBefore(@Param("role") AppRole role, @Param("date") LocalDateTime date);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.organizationId = :orgId AND u.createdAt < :date")
    long countByRoleAndOrganizationIdAndCreatedAtBefore(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("date") LocalDateTime date);
    
    @Query("SELECT u FROM User u WHERE " +
           "(LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%') OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.organizationId = :organizationId AND " +
           "(LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%') OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<User> searchUsersInOrganization(@Param("query") String query, @Param("organizationId") UUID organizationId, Pageable pageable);

    Page<User> findByRole(AppRole role, Pageable pageable);
    List<User> findByRole(AppRole role);
    Page<User> findByRoleAndOrganizationId(AppRole role, UUID organizationId, Pageable pageable);
    List<User> findByRoleAndOrganizationId(AppRole role, UUID organizationId);

    List<User> findByOrganizationId(UUID organizationId);
    Page<User> findByOrganizationId(UUID organizationId, Pageable pageable);
    
    List<User> findByGroupId(UUID groupId);
    List<User> findByRoleAndGroupId(AppRole role, UUID groupId);
    Long countByGroupId(UUID groupId);

    // New method for universal search by role
    @Query("SELECT u FROM User u WHERE u.role = :role AND (" +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :searchTerm, '%'))")
    List<User> findByRoleAndSearchTerm(@Param("role") AppRole role, @Param("searchTerm") String searchTerm);

    @Query("SELECT u FROM User u WHERE u.role = :role AND (" +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%'))")
    Page<User> searchByRoleAndQuery(@Param("role") AppRole role, @Param("query") String query, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role = :role AND u.organizationId = :orgId AND (" +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%'))")
    Page<User> searchByRoleAndOrganizationAndQuery(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("query") String query, Pageable pageable);

    // Referral system
    Optional<User> findByReferralCode(String referralCode);
    List<User> findByReferredBy(UUID referredBy);
    long countByReferredBy(UUID referredBy);

    // Leaderboard Rebuild Queries
    long countByRoleAndActive(AppRole role, boolean active);
    long countByRoleAndOrganizationIdAndActive(AppRole role, UUID orgId, boolean active);

    @Query("SELECT u, " +
           "(SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) " +
           "FROM User u " +
           "WHERE u.role = :role AND u.active = true " +
           "ORDER BY u.coins DESC, u.xp DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardAllTimeGlobal(@Param("role") AppRole role, Pageable pageable);

    @Query("SELECT u, " +
           "(SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) " +
           "FROM User u " +
           "WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId " +
           "ORDER BY u.coins DESC, u.xp DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardAllTimeByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT u, " +
           "(SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL), " +
           "COALESCE((SELECT SUM(ct.amount) FROM CoinTransaction ct WHERE ct.student = u AND ct.createdAt >= :startDate), 0L) as periodCoins, " +
           "COALESCE((SELECT SUM(xt.amount) FROM XpTransaction xt WHERE xt.user = u AND xt.createdAt >= :startDate), 0L) as periodXp " +
           "FROM User u " +
           "WHERE u.role = :role AND u.active = true " +
           "ORDER BY periodCoins DESC, periodXp DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardPeriodGlobal(@Param("role") AppRole role, @Param("startDate") LocalDateTime startDate, Pageable pageable);

    @Query("SELECT u, " +
           "(SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL), " +
           "COALESCE((SELECT SUM(ct.amount) FROM CoinTransaction ct WHERE ct.student = u AND ct.createdAt >= :startDate), 0L) as periodCoins, " +
           "COALESCE((SELECT SUM(xt.amount) FROM XpTransaction xt WHERE xt.user = u AND xt.createdAt >= :startDate), 0L) as periodXp " +
           "FROM User u " +
           "WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId " +
           "ORDER BY periodCoins DESC, periodXp DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardPeriodByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("startDate") LocalDateTime startDate, Pageable pageable);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND " +
           "(u.coins > :coins OR (u.coins = :coins AND u.xp > :xp) OR (u.coins = :coins AND u.xp = :xp AND u.createdAt < :createdAt))")
    long countUsersAboveAllTimeGlobal(@Param("role") AppRole role, @Param("coins") Long coins, @Param("xp") Long xp, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId AND " +
           "(u.coins > :coins OR (u.coins = :coins AND u.xp > :xp) OR (u.coins = :coins AND u.xp = :xp AND u.createdAt < :createdAt))")
    long countUsersAboveAllTimeByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("coins") Long coins, @Param("xp") Long xp, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND " +
           "COALESCE((SELECT SUM(ct.amount) FROM CoinTransaction ct WHERE ct.student = u AND ct.createdAt >= :startDate), 0L) > :periodCoins")
    long countUsersAbovePeriodGlobal(@Param("role") AppRole role, @Param("startDate") LocalDateTime startDate, @Param("periodCoins") Long periodCoins);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId AND " +
           "COALESCE((SELECT SUM(ct.amount) FROM CoinTransaction ct WHERE ct.student = u AND ct.createdAt >= :startDate), 0L) > :periodCoins")
    long countUsersAbovePeriodByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("startDate") LocalDateTime startDate, @Param("periodCoins") Long periodCoins);

    @Query("SELECT COALESCE(SUM(ct.amount), 0L) FROM CoinTransaction ct WHERE ct.student.id = :userId AND ct.createdAt >= :startDate")
    Long getLeaderboardPeriodCoins(@Param("userId") UUID userId, @Param("startDate") LocalDateTime startDate);

    // Metric-based Leaderboard queries
    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) FROM User u WHERE u.role = :role AND u.active = true ORDER BY u.xp DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByStarsGlobal(@Param("role") AppRole role, Pageable pageable);

    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId ORDER BY u.xp DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByStarsByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) FROM User u WHERE u.role = :role AND u.active = true ORDER BY u.coins DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByCoinsGlobal(@Param("role") AppRole role, Pageable pageable);

    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId ORDER BY u.coins DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByCoinsByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) FROM User u WHERE u.role = :role AND u.active = true ORDER BY u.currentStreak DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByStreakGlobal(@Param("role") AppRole role, Pageable pageable);

    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId ORDER BY u.currentStreak DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByStreakByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL), COALESCE((SELECT SUM(ps.minutes) FROM PracticeSession ps WHERE ps.user = u), 0.0) as totalPractice FROM User u WHERE u.role = :role AND u.active = true ORDER BY totalPractice DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByPracticeGlobal(@Param("role") AppRole role, Pageable pageable);

    @Query("SELECT u, (SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student = u AND sa.finishedAt IS NOT NULL), COALESCE((SELECT SUM(ps.minutes) FROM PracticeSession ps WHERE ps.user = u), 0.0) as totalPractice FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId ORDER BY totalPractice DESC, u.createdAt ASC")
    Page<Object[]> getLeaderboardByPracticeByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, Pageable pageable);

    // Rank counting queries per metric
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND (u.xp > :xp OR (u.xp = :xp AND u.createdAt < :createdAt))")
    long countUsersAboveStarsGlobal(@Param("role") AppRole role, @Param("xp") Long xp, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId AND (u.xp > :xp OR (u.xp = :xp AND u.createdAt < :createdAt))")
    long countUsersAboveStarsByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("xp") Long xp, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND (u.coins > :coins OR (u.coins = :coins AND u.createdAt < :createdAt))")
    long countUsersAboveCoinsGlobal(@Param("role") AppRole role, @Param("coins") Long coins, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId AND (u.coins > :coins OR (u.coins = :coins AND u.createdAt < :createdAt))")
    long countUsersAboveCoinsByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("coins") Long coins, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND (u.currentStreak > :streak OR (u.currentStreak = :streak AND u.createdAt < :createdAt))")
    long countUsersAboveStreakGlobal(@Param("role") AppRole role, @Param("streak") Integer streak, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId AND (u.currentStreak > :streak OR (u.currentStreak = :streak AND u.createdAt < :createdAt))")
    long countUsersAboveStreakByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("streak") Integer streak, @Param("createdAt") LocalDateTime createdAt);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND COALESCE((SELECT SUM(ps.minutes) FROM PracticeSession ps WHERE ps.user = u), 0.0) > :practiceMinutes")
    long countUsersAbovePracticeGlobal(@Param("role") AppRole role, @Param("practiceMinutes") Double practiceMinutes);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true AND u.organizationId = :orgId AND COALESCE((SELECT SUM(ps.minutes) FROM PracticeSession ps WHERE ps.user = u), 0.0) > :practiceMinutes")
    long countUsersAbovePracticeByOrg(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("practiceMinutes") Double practiceMinutes);

    @Query("SELECT COALESCE(SUM(ps.minutes), 0.0) FROM PracticeSession ps WHERE ps.user.id = :userId")
    Double getTotalPracticeMinutes(@Param("userId") UUID userId);
}


