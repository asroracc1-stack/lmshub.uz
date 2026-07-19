package com.lmscrm.backend.controller.user;

import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.ProfileRepository;
import com.lmscrm.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
@Tag(name = "User Profile Controller", description = "Endpoints for current user profile")
public class UserProfileController {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final jakarta.persistence.EntityManager entityManager;
    private final com.lmscrm.backend.service.SubscriptionService subscriptionService;

    @GetMapping("/profile")
    @Operation(summary = "Get Current User Profile")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        // Check and expire active subscriptions in real-time
        subscriptionService.checkAndExpireUserSubscriptions(currentUser);

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Profile profile = profileRepository.findById(user.getId()).orElse(null);

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("username", user.getUsername());
        response.put("role", user.getRole());
        response.put("fullName", user.getFullName());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("coins", user.getCoins());
        response.put("xp", user.getXp());
        response.put("targetBand", user.getTargetBand());
        response.put("examDate", user.getExamDate());
        response.put("lastLoginAt", user.getLastLoginAt());
        response.put("organizationId", user.getOrganizationId());
        
        if (profile != null) {
            response.put("firstName", profile.getFirstName());
            response.put("lastName", profile.getLastName());
            response.put("phone", profile.getPhone());
        }

        try {
            // Find the most prominent active subscription joining subscription_packs (not subscription_packages)
            java.util.List<?> subs = entityManager.createNativeQuery(
                "SELECT p.code FROM public.user_subscriptions us " +
                "JOIN public.subscription_packs p ON us.pack_id = p.id " +
                "WHERE us.user_id = CAST(:userId AS UUID) AND us.is_active = true " +
                "AND us.expires_at > NOW() " +
                "ORDER BY p.price DESC LIMIT 1"
            )
            .setParameter("userId", user.getId().toString())
            .getResultList();

            if (!subs.isEmpty() && subs.get(0) != null) {
                response.put("subscriptionPackCode", subs.get(0).toString());
            } else {
                response.put("subscriptionPackCode", null);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(response);
    }


    @org.springframework.web.bind.annotation.PutMapping("/profile")
    @Operation(summary = "Update User Profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @org.springframework.web.bind.annotation.RequestBody Map<String, Object> updates) {
        
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (updates.containsKey("examDate")) {
            String dateStr = (String) updates.get("examDate");
            if (dateStr != null && !dateStr.isEmpty()) {
                user.setExamDate(java.time.LocalDate.parse(dateStr));
            } else {
                user.setExamDate(null);
            }
        }

        if (updates.containsKey("targetBand")) {
            Object tb = updates.get("targetBand");
            if (tb instanceof Number) {
                user.setTargetBand(((Number) tb).doubleValue());
            }
        }

        userRepository.save(user);
        return ResponseEntity.ok(user);
    }
}
