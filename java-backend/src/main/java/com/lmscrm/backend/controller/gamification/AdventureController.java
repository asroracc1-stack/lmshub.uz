package com.lmscrm.backend.controller.gamification;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.gamification.JourneyRegion;
import com.lmscrm.backend.domain.entity.gamification.UserTravelState;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.gamification.JourneyRegionRepository;
import com.lmscrm.backend.repository.gamification.UserTravelStateRepository;
import com.lmscrm.backend.service.gamification.TravelEngineService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/adventure")
@RequiredArgsConstructor
public class AdventureController {

    private final UserTravelStateRepository travelStateRepository;
    private final JourneyRegionRepository regionRepository;
    private final TravelEngineService travelEngineService;
    private final UserRepository userRepository;

    @GetMapping("/state")
    public ResponseEntity<?> getAdventureState(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        UserTravelState state = travelStateRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserTravelState s = new UserTravelState();
                    s.setUser(user);
                    s.setTotalTravelPoints(0L);
                    s.setAvatarLevel(1);
                    s.setAvatarTitle("Beginner Traveler");
                    return travelStateRepository.save(s);
                });

        return ResponseEntity.ok(Map.of(
                "totalPoints", state.getTotalTravelPoints(),
                "currentRegionId", state.getCurrentRegion() != null ? state.getCurrentRegion().getId() : null,
                "currentRegionName", state.getCurrentRegion() != null ? state.getCurrentRegion().getName() : "Nukus",
                "avatarLevel", state.getAvatarLevel(),
                "avatarTitle", state.getAvatarTitle()
        ));
    }

    @GetMapping("/map")
    public ResponseEntity<?> getMapData() {
        List<JourneyRegion> regions = regionRepository.findAllByOrderByOrderIndexAsc();
        List<Map<String, Object>> regionData = regions.stream().map(r -> Map.<String, Object>of(
                "id", r.getId(),
                "name", r.getName(),
                "theme", r.getTheme() == null ? "" : r.getTheme(),
                "description", r.getDescription() == null ? "" : r.getDescription(),
                "requiredPoints", r.getRequiredPoints(),
                "orderIndex", r.getOrderIndex(),
                "svgPath", r.getSvgPath() == null ? "" : r.getSvgPath()
        )).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("regions", regionData));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard() {
        // Top 5 users by total travel points
        List<UserTravelState> topTravelers = travelStateRepository.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "totalTravelPoints"))
        ).getContent();

        List<Map<String, Object>> leaderboard = topTravelers.stream().map(s -> Map.<String, Object>of(
                "userId", s.getUser().getId(),
                "fullName", s.getUser().getFullName(),
                "points", s.getTotalTravelPoints(),
                "region", s.getCurrentRegion() != null ? s.getCurrentRegion().getName() : "Nukus",
                "avatarTitle", s.getAvatarTitle()
        )).collect(Collectors.toList());

        return ResponseEntity.ok(leaderboard);
    }

    @PostMapping("/calculate")
    public ResponseEntity<?> triggerCalculation(Authentication authentication, @RequestBody CalculationRequest request) {
        User user = (User) authentication.getPrincipal();
        
        travelEngineService.addTravelPoints(
                user,
                request.getTestsSolved(),
                request.getCorrectAnswers(),
                request.getStreakDays(),
                request.getAchievementsEarned(),
                request.getNewCoins()
        );

        return ResponseEntity.ok(Map.of("message", "Progress updated successfully"));
    }

    @Data
    public static class CalculationRequest {
        private int testsSolved;
        private int correctAnswers;
        private int streakDays;
        private int achievementsEarned;
        private int newCoins;
    }
}
