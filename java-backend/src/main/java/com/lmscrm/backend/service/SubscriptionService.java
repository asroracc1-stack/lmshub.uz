package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final com.lmscrm.backend.repository.UserRepository userRepository;

    /**
     * Checks all subscriptions for the given user, expires any that have expired,
     * and downgrades their role to USER if no active subscriptions remain.
     */
    @org.springframework.transaction.annotation.Transactional
    public void checkAndExpireUserSubscriptions(User user) {
        if (user == null) return;

        List<UserSubscription> subscriptions = userSubscriptionRepository.findByUserId(user.getId());
        LocalDateTime now = LocalDateTime.now();
        boolean roleChanged = false;
        boolean hasAnyActive = false;

        for (UserSubscription sub : subscriptions) {
            if (Boolean.TRUE.equals(sub.getIsActive())) {
                if (sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(now)) {
                    sub.setIsActive(false);
                    sub.setStatus("EXPIRED");
                    userSubscriptionRepository.save(sub);
                    roleChanged = true;
                } else {
                    hasAnyActive = true;
                }
            }
        }

        if (roleChanged && !hasAnyActive && user.getRole() == AppRole.STUDENT) {
            user.setRole(AppRole.USER);
            userRepository.save(user);
            log.info("Downgraded user {} to USER role due to subscription expiration", user.getUsername());
        }
    }

    /**
     * Checks if the user has access to a given mock exam.
     */
    public boolean hasMockAccess(User user, Exam exam) {
        if (user == null || exam == null) return false;

        // Admins, Super Admins, and Teachers have global access
        if (user.getRole() == AppRole.SUPER_ADMIN || user.getRole() == AppRole.ADMIN || user.getRole() == AppRole.TEACHER) {
            return true;
        }

        // If mock exam is free, anyone can access it
        if (exam.getRequiredPack() == null || exam.getRequiredPack().equalsIgnoreCase("free") || exam.getRequiredPack().equalsIgnoreCase("any")) {
            return true;
        }

        // Fetch user's active subscription
        Optional<UserSubscription> subOpt = userSubscriptionRepository.findFirstByUserIdAndIsActiveTrueOrderByExpiresAtDesc(user.getId());
        if (subOpt.isEmpty()) {
            log.warn("User {} has no active subscription for mock {}", user.getUsername(), exam.getTitle());
            return false;
        }

        UserSubscription sub = subOpt.get();
        if (sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("User {} subscription has expired for mock {}", user.getUsername(), exam.getTitle());
            return false;
        }

        SubscriptionPack pack = sub.getPack();
        if (pack == null) return false;

        // Case 1: Package allows all mocks
        if (Boolean.TRUE.equals(pack.getAccessAllMocks())) {
            return true;
        }

        // Case 2: Package allows mock categories
        ExamType type = exam.getType();
        if (type == ExamType.SAT && Boolean.TRUE.equals(pack.getAccessSatMocks())) {
            return true;
        }
        if (type == ExamType.NATIONAL_CERT && Boolean.TRUE.equals(pack.getAccessNatMocks())) {
            return true;
        }
        if (type == ExamType.IELTS && Boolean.TRUE.equals(pack.getAccessIeltsMocks())) {
            return true;
        }
        if (type == ExamType.GENERAL && Boolean.TRUE.equals(pack.getAccessCustomMocks())) {
            return true;
        }

        // Case 3: Package allows specific mock tests
        if (pack.getExams() != null && pack.getExams().stream().anyMatch(e -> e.getId().equals(exam.getId()))) {
            return true;
        }

        return false;
    }

    /**
     * Checks if the user has access to a given library material.
     */
    public boolean hasLibraryAccess(User user, LibraryMaterial material) {
        if (user == null || material == null) return false;

        // Admins, Super Admins, and Teachers have global access
        if (user.getRole() == AppRole.SUPER_ADMIN || user.getRole() == AppRole.ADMIN || user.getRole() == AppRole.TEACHER) {
            return true;
        }

        // FREE materials are accessible by everyone
        if (material.getAccessType() == null || material.getAccessType().equalsIgnoreCase("FREE")) {
            return true;
        }

        // Fetch user's active subscription
        Optional<UserSubscription> subOpt = userSubscriptionRepository.findFirstByUserIdAndIsActiveTrueOrderByExpiresAtDesc(user.getId());
        if (subOpt.isEmpty()) {
            log.warn("User {} has no active subscription for library book {}", user.getUsername(), material.getTitle());
            return false;
        }

        UserSubscription sub = subOpt.get();
        if (sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(LocalDateTime.now())) {
            log.warn("User {} subscription has expired for library book {}", user.getUsername(), material.getTitle());
            return false;
        }

        SubscriptionPack pack = sub.getPack();
        if (pack == null) return false;

        // Case 1: Package allows all books
        if (Boolean.TRUE.equals(pack.getAccessAllBooks())) {
            return true;
        }

        // Case 2: Package allows specific books
        if (pack.getAllowedBooks() != null && pack.getAllowedBooks().stream().anyMatch(b -> b.getId().equals(material.getId()))) {
            return true;
        }

        // Case 3: Match package tier hierarchy
        String accessType = material.getAccessType().toUpperCase();
        String packType = pack.getType() != null ? pack.getType().name() : "FREE";

        if (packType.equals("ELITE")) {
            return true;
        }
        if (packType.equals("PRO") && (accessType.equals("PRO") || accessType.equals("FREE"))) {
            return true;
        }

        return false;
    }
}
