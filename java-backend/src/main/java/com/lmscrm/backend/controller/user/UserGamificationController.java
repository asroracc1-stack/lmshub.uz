package com.lmscrm.backend.controller.user;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.service.GamificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/gamification")
@RequiredArgsConstructor
public class UserGamificationController {

    private final GamificationService gamificationService;

    @GetMapping("/progress")
    public ResponseEntity<Map<String, Object>> getProgress(@AuthenticationPrincipal User currentUser) {
        Map<String, Object> progress = gamificationService.getUserProgress(currentUser);
        return ResponseEntity.ok(progress);
    }

    @PostMapping("/claim/{checkpointId}")
    public ResponseEntity<Map<String, Object>> claimReward(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID checkpointId) {
        Map<String, Object> result = gamificationService.claimCheckpointReward(currentUser, checkpointId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/contributions")
    public ResponseEntity<Map<String, Object>> getContributions(@AuthenticationPrincipal User currentUser) {
        Map<String, Object> contributions = gamificationService.getUserContributions(currentUser);
        return ResponseEntity.ok(contributions);
    }
}
