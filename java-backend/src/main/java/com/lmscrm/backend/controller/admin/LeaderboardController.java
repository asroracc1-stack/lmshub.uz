package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.dto.admin.LeaderboardDto;
import com.lmscrm.backend.service.admin.LeaderboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/leaderboard")
@RequiredArgsConstructor
@Tag(name = "Leaderboard Controller", description = "Endpoints for Leaderboard rankings")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get Leaderboard rankings by metric and role")
    public ResponseEntity<com.lmscrm.backend.dto.admin.LeaderboardResponseDto> getLeaderboard(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.lmscrm.backend.domain.entity.User user,
            @RequestParam(defaultValue = "stars") String metric,
            @RequestParam(defaultValue = "STUDENT") String role,
            @RequestParam(defaultValue = "false") boolean isGlobal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(leaderboardService.getLeaderboard(user, metric, role, isGlobal, page, size));
    }


    @GetMapping("/regular-users")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get Leaderboard for regular users (without organization)")
    public ResponseEntity<List<LeaderboardDto>> getRegularUsersLeaderboard(
            @RequestParam(defaultValue = "week") String period,
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(leaderboardService.getRegularUsersLeaderboard(period, limit));
    }
}
