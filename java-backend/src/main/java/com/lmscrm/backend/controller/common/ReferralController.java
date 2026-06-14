package com.lmscrm.backend.controller.common;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/referral")
@RequiredArgsConstructor
@Tag(name = "Referral Controller", description = "Invite system & coin rewards")
public class ReferralController {

    private final UserRepository userRepository;

    @GetMapping("/my-info")
    @Operation(summary = "Get current user's referral info")
    public ResponseEntity<Map<String, Object>> getMyReferralInfo(@AuthenticationPrincipal User currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate code if missing
        if (user.getReferralCode() == null || user.getReferralCode().isEmpty()) {
            String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            StringBuilder sb = new StringBuilder();
            Random rnd = new Random();
            for (int i = 0; i < 8; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
            user.setReferralCode(sb.toString());
            userRepository.save(user);
        }

        long inviteCount = userRepository.countByReferredBy(user.getId());

        String referredByName = null;
        if (user.getReferredBy() != null) {
            Optional<User> referrerOpt = userRepository.findById(user.getReferredBy());
            if (referrerOpt.isPresent()) {
                User referrer = referrerOpt.get();
                referredByName = referrer.getFullName() != null ? referrer.getFullName() : referrer.getUsername();
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("referralCode", user.getReferralCode());
        result.put("coins", user.getCoins() != null ? user.getCoins() : 0L);
        result.put("inviteCount", inviteCount);
        result.put("referredByName", referredByName);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my-invites")
    @Operation(summary = "Get list of users invited by current user")
    public ResponseEntity<List<Map<String, Object>>> getMyInvites(@AuthenticationPrincipal User currentUser) {
        List<User> invitees = userRepository.findByReferredBy(currentUser.getId());

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd.MM.yyyy, HH:mm:ss");
        List<Map<String, Object>> result = invitees.stream().map(u -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", u.getId());
            item.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUsername());
            item.put("email", u.getEmail());
            item.put("referralCode", u.getReferralCode());
            item.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().format(fmt) : "");
            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
