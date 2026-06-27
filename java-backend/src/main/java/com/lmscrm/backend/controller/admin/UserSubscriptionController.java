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
public class UserSubscriptionController {

    @PersistenceContext
    private EntityManager entityManager;

    private final UserRepository userRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;

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
}
