package com.lmscrm.backend.controller.aispeaking;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.aispeaking.*;
import com.lmscrm.backend.security.SecurityUtils;
import com.lmscrm.backend.service.aispeaking.AISpeakingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ai-speaking")
@RequiredArgsConstructor
public class AISpeakingController {

    private final AISpeakingService aiSpeakingService;
    private final SecurityUtils securityUtils;
    private final java.util.Map<java.util.UUID, TokenBucket> rateLimits = new java.util.concurrent.ConcurrentHashMap<>();

    private static class TokenBucket {
        private final long capacity = 15;
        private double tokens = 15.0;
        private long lastRefill = System.currentTimeMillis();

        public synchronized boolean tryConsume() {
            long now = System.currentTimeMillis();
            double delta = (now - lastRefill) / 60000.0 * 15.0; 
            if (delta > 0) {
                tokens = Math.min(capacity, tokens + delta);
                lastRefill = now;
            }
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }
    }

    @PostMapping("/session/start")
    public ResponseEntity<SessionStartResponseDto> startSession(@RequestBody @Valid SessionStartRequestDto dto) {
        User user = securityUtils.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(aiSpeakingService.startSession(user.getId(), dto));
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponseDto> processChat(@RequestBody @Valid ChatRequestDto dto) {
        User user = securityUtils.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        TokenBucket bucket = rateLimits.computeIfAbsent(user.getId(), k -> new TokenBucket());
        if (!bucket.tryConsume()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS).build();
        }
        return ResponseEntity.ok(aiSpeakingService.processChat(user.getId(), dto));
    }

    @PostMapping("/session/end")
    public ResponseEntity<SessionEndResponseDto> endSession(@RequestBody @Valid SessionEndRequestDto dto) {
        User user = securityUtils.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(aiSpeakingService.endSession(user.getId(), dto));
    }

    @GetMapping("/history")
    public ResponseEntity<List<HistoryResponseDto>> getUserHistory() {
        User user = securityUtils.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(aiSpeakingService.getUserHistory(user.getId()));
    }

    @GetMapping("/statistics")
    public ResponseEntity<StatisticsResponseDto> getUserStatistics() {
        User user = securityUtils.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(aiSpeakingService.getUserStatistics(user.getId()));
    }
}
