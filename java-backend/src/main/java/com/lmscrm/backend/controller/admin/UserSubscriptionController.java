package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.UserSubscription;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.UserSubscriptionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Endpoint for checking current user's active subscription pack.
 */
@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class UserSubscriptionController {

    @PersistenceContext
    private EntityManager entityManager;

    private final UserRepository userRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final com.lmscrm.backend.repository.UserAiUsageRepository userAiUsageRepository;

    /**
     * Returns the current user's active subscription pack type.
     * Returns { packType: "FREE" | "PRO" | "ELITE", hasActive: true/false }
     */
    @GetMapping("/my-subscription")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getMySubscription(Authentication auth) {
        Map<String, Object> result = new HashMap<>();

        try {
            String authName = auth.getName();
            java.util.Optional<com.lmscrm.backend.domain.entity.User> userOpt = userRepository.findByEmailOrUsername(authName, authName);

            if (userOpt.isEmpty()) {
                result.put("hasActive", false);
                result.put("packType", "FREE");
                result.put("status", "NONE");
                result.put("packageId", null);
                result.put("expiresAt", null);
                result.put("remainingDays", 0);
                result.put("startDate", null);
                return ResponseEntity.ok(result);
            }

            com.lmscrm.backend.domain.entity.User user = userOpt.get();
            List<UserSubscription> subscriptions = userSubscriptionRepository.findByUserId(user.getId());
            LocalDateTime now = LocalDateTime.now();

            List<UserSubscription> activeSubs = subscriptions.stream()
                .filter(sub -> Boolean.TRUE.equals(sub.getIsActive()))
                .filter(sub -> sub.getExpiresAt() == null || sub.getExpiresAt().isAfter(now))
                .sorted((a, b) -> {
                    String typeA = a.getPack() != null && a.getPack().getType() != null ? a.getPack().getType().name() : "FREE";
                    String typeB = b.getPack() != null && b.getPack().getType() != null ? b.getPack().getType().name() : "FREE";
                    int valA = typeA.equals("ELITE") ? 1 : (typeA.equals("PRO") ? 2 : 3);
                    int valB = typeB.equals("ELITE") ? 1 : (typeB.equals("PRO") ? 2 : 3);
                    return Integer.compare(valA, valB);
                })
                .collect(Collectors.toList());

            if (!activeSubs.isEmpty()) {
                UserSubscription sub = activeSubs.get(0);
                String packType = sub.getPack() != null && sub.getPack().getType() != null ? sub.getPack().getType().name() : "FREE";
                LocalDateTime expiresAt = sub.getExpiresAt();
                java.util.UUID packageId = sub.getPack() != null ? sub.getPack().getId() : null;
                LocalDateTime startsAt = sub.getStartsAt();

                result.put("hasActive", true);
                result.put("packType", packType);
                result.put("status", "ACTIVE");
                result.put("packageId", packageId != null ? packageId.toString() : null);
                result.put("expiresAt", expiresAt != null ? expiresAt.toString() : null);
                result.put("startDate", startsAt != null ? startsAt.toString() : null);

                // Calculate remaining days
                long remainingDays = 0;
                if (expiresAt != null) {
                    if (expiresAt.isAfter(now)) {
                        remainingDays = java.time.temporal.ChronoUnit.DAYS.between(now, expiresAt);
                    }
                }
                result.put("remainingDays", remainingDays);
            } else {
                result.put("hasActive", false);
                result.put("packType", "FREE");
                result.put("status", "NONE");
                result.put("packageId", null);
                result.put("expiresAt", null);
                result.put("remainingDays", 0);
                result.put("startDate", null);
            }
        } catch (Exception e) {
            System.err.println("[my-subscription] ERROR for user " + auth.getName() + ": " + e.getMessage());
            e.printStackTrace();
            result.put("hasActive", false);
            result.put("packType", "FREE");
            result.put("status", "NONE");
            result.put("packageId", null);
            result.put("expiresAt", null);
            result.put("remainingDays", 0);
            result.put("startDate", null);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Returns all user subscriptions.
     */
    @GetMapping("/my-subscriptions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getMySubscriptions(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<UserSubscription> subscriptions = userSubscriptionRepository.findByUserId(user.getId());

        List<Map<String, Object>> result = subscriptions.stream().map(sub -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", sub.getId());
            map.put("packId", sub.getPack() != null ? sub.getPack().getId() : null);
            map.put("packName", sub.getPack() != null ? sub.getPack().getName() : "Unknown");
            map.put("packType", sub.getPack() != null ? sub.getPack().getType().name() : "FREE");
            map.put("startsAt", sub.getStartsAt());
            map.put("expiresAt", sub.getExpiresAt());

            boolean expired = sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(LocalDateTime.now());
            String computedStatus = expired ? "EXPIRED" : (Boolean.TRUE.equals(sub.getIsActive()) ? "ACTIVE" : "INACTIVE");
            map.put("status", computedStatus);
            map.put("isActive", Boolean.TRUE.equals(sub.getIsActive()) && !expired);

            long remainingDays = 0;
            if (!expired && sub.getExpiresAt() != null) {
                remainingDays = ChronoUnit.DAYS.between(LocalDateTime.now(), sub.getExpiresAt());
                if (remainingDays < 0) remainingDays = 0;
            }
            map.put("remainingDays", remainingDays);

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    private final com.lmscrm.backend.repository.SubscriptionRequestRepository subscriptionRequestRepository;

    /**
     * Returns all subscription requests for the current user.
     */
    @GetMapping("/my-subscription-requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getMySubscriptionRequests(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<com.lmscrm.backend.domain.entity.SubscriptionRequest> requests = subscriptionRequestRepository.findByUserIdOrderByRequestedAtDesc(user.getId());

        List<Map<String, Object>> result = requests.stream().map(req -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", req.getId());
            map.put("packId", req.getPack() != null ? req.getPack().getId() : null);
            map.put("packName", req.getPack() != null ? req.getPack().getName() : "Unknown");
            map.put("requestedAt", req.getRequestedAt());
            map.put("status", req.getStatus());
            map.put("receiptUrl", req.getReceiptUrl());
            map.put("rejectionReason", req.getRejectionReason());
            map.put("processedAt", req.getProcessedAt());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Returns the current user's AI limits and usage statistics.
     */
    @GetMapping("/ai-usage")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getAiUsage(Authentication auth) {
        Map<String, Object> result = new HashMap<>();
        User user = userRepository.findByEmailOrUsername(auth.getName(), auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<UserSubscription> subscriptions = userSubscriptionRepository.findByUserId(user.getId());
        LocalDateTime now = LocalDateTime.now();

        UserSubscription activeSub = subscriptions.stream()
                .filter(sub -> Boolean.TRUE.equals(sub.getIsActive()))
                .filter(sub -> sub.getExpiresAt() == null || sub.getExpiresAt().isAfter(now))
                .findFirst()
                .orElse(null);

        if (activeSub == null) {
            result.put("hasActivePlan", false);
            result.put("planName", "Free Trial");
            result.put("packType", "FREE");
            result.put("speakingMinutesUsed", 0);
            result.put("speakingMinutesLimit", 0);
            result.put("speakingMinutesUnlimited", false);
            result.put("messagesUsed", 0);
            result.put("messagesLimit", 0);
            result.put("messagesUnlimited", false);
            result.put("tokensUsed", 0);
            result.put("tokensLimit", 0);
            result.put("tokensUnlimited", false);
            return ResponseEntity.ok(result);
        }

        SubscriptionPack pack = activeSub.getPack();
        com.lmscrm.backend.domain.entity.UserAiUsage usage = userAiUsageRepository.findById(user.getId())
                .orElseGet(() -> {
                    com.lmscrm.backend.domain.entity.UserAiUsage nu = com.lmscrm.backend.domain.entity.UserAiUsage.builder()
                            .userId(user.getId())
                            .lastResetDate(now)
                            .build();
                    return userAiUsageRepository.save(nu);
                });

        result.put("hasActivePlan", true);
        result.put("planName", pack.getName());
        result.put("packType", pack.getType().name());
        result.put("expiresAt", activeSub.getExpiresAt() != null ? activeSub.getExpiresAt().toString() : null);

        // Speaking Limit
        result.put("speakingMinutesUsed", usage.getSpeakingMinutesUsed());
        result.put("speakingMinutesLimit", pack.getAiLimitSpeakingMinutes());
        result.put("speakingMinutesUnlimited", pack.getAiUnlimitedSpeaking());

        // Messages Limit
        result.put("messagesUsed", usage.getMessagesUsed());
        result.put("messagesLimit", pack.getAiLimitMessagesPerMonth());
        result.put("messagesUnlimited", pack.getAiUnlimitedMessages());

        // Tokens Limit
        result.put("tokensUsed", usage.getTokensUsed());
        result.put("tokensLimit", pack.getAiLimitTokens());
        result.put("tokensUnlimited", pack.getAiUnlimitedTokens());

        // Sessions Limit
        result.put("sessionsUsed", usage.getSessionsUsed());
        result.put("sessionsLimit", pack.getAiLimitSessionsPerMonth());

        // Quiz Limit
        result.put("quizGenerationsUsed", usage.getQuizGenerations());
        result.put("quizGenerationsLimit", pack.getAiLimitQuizGenCount());

        // Feature Matrix
        Map<String, Boolean> features = new HashMap<>();
        features.put("premiumVoices", pack.getAiFeaturePremiumVoices());
        features.put("ieltsCoach", pack.getAiFeatureIeltsCoach());
        features.put("businessEnglish", pack.getAiFeatureBusinessEnglish());
        features.put("interviewCoach", pack.getAiFeatureInterviewCoach());
        features.put("conversationHistory", pack.getAiFeatureConversationHistory());
        features.put("advancedFeedback", pack.getAiFeatureAdvancedFeedback());
        features.put("fastResponses", pack.getAiFeatureFastResponses());
        features.put("priorityQueue", pack.getAiFeaturePriorityQueue());
        features.put("teacherDashboard", pack.getAiFeatureTeacherDashboard());
        features.put("organizationAi", pack.getAiFeatureOrganizationAi());
        result.put("features", features);

        return ResponseEntity.ok(result);
    }
}
