package com.lmscrm.backend.controller.admin;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Endpoint for checking current user's active subscription pack.
 */
@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class UserSubscriptionController {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Returns the current user's active subscription pack type.
     * Returns { packType: "FREE" | "PRO" | "ELITE", hasActive: true/false }
     */
    @GetMapping("/my-subscription")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getMySubscription(Authentication auth) {
        Map<String, Object> result = new HashMap<>();

        try {
            // Find user id by username
            List<?> userRows = entityManager.createNativeQuery(
                "SELECT id FROM public.users WHERE username = :username LIMIT 1"
            ).setParameter("username", auth.getName()).getResultList();

            if (userRows.isEmpty()) {
                result.put("hasActive", false);
                result.put("packType", "FREE");
                return ResponseEntity.ok(result);
            }

            Object userId = userRows.get(0);

            // Find active subscription
            List<?> subRows = entityManager.createNativeQuery(
                "SELECT sp.type FROM public.user_subscriptions us " +
                "JOIN public.subscription_packs sp ON sp.id = us.pack_id " +
                "WHERE us.user_id = :userId AND us.is_active = true " +
                "AND (us.expires_at IS NULL OR us.expires_at > NOW()) " +
                "ORDER BY CASE sp.type WHEN 'ELITE' THEN 1 WHEN 'PRO' THEN 2 ELSE 3 END LIMIT 1"
            ).setParameter("userId", userId).getResultList();

            if (!subRows.isEmpty()) {
                result.put("hasActive", true);
                result.put("packType", subRows.get(0).toString());
            } else {
                result.put("hasActive", false);
                result.put("packType", "FREE");
            }
        } catch (Exception e) {
            result.put("hasActive", false);
            result.put("packType", "FREE");
        }

        return ResponseEntity.ok(result);
    }
}
