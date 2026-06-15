package com.lmscrm.backend.service.gamification;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.gamification.GamificationConfig;
import com.lmscrm.backend.domain.entity.gamification.JourneyRegion;
import com.lmscrm.backend.domain.entity.gamification.UserTravelState;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.gamification.GamificationConfigRepository;
import com.lmscrm.backend.repository.gamification.JourneyRegionRepository;
import com.lmscrm.backend.repository.gamification.UserTravelStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TravelEngineService {

    private final UserTravelStateRepository travelStateRepository;
    private final GamificationConfigRepository configRepository;
    private final JourneyRegionRepository regionRepository;
    private final RewardService rewardService;

    @Transactional
    public void addTravelPoints(User user, int testsSolved, int correctAnswers, int streakDays, int achievementsEarned, int newCoins) {
        GamificationConfig config = configRepository.findFirstByActiveTrueOrderByUpdatedAtDesc()
                .orElseGet(GamificationConfig::new); // Fallback to defaults

        long earnedPoints = (long) (
                (testsSolved * config.getTestSolvedMultiplier()) +
                (correctAnswers * config.getCorrectAnswerMultiplier()) +
                (streakDays * config.getStreakDaysMultiplier()) +
                (achievementsEarned * config.getAchievementsMultiplier()) +
                (newCoins / config.getCoinsDivider())
        );

        UserTravelState state = travelStateRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserTravelState newState = new UserTravelState();
                    newState.setUser(user);
                    return newState;
                });

        state.setTotalTravelPoints(state.getTotalTravelPoints() + earnedPoints);
        
        // Check for Avatar upgrades
        updateAvatarLevel(state);

        // Check for Region upgrades
        checkRegionUpgrades(state);

        travelStateRepository.save(state);
    }

    private void updateAvatarLevel(UserTravelState state) {
        long points = state.getTotalTravelPoints();
        int newLevel = (int) (points / 100) + 1; // Basic formula: 100 pts = 1 level
        state.setAvatarLevel(newLevel);

        if (newLevel >= 50) {
            state.setAvatarTitle("Master Explorer");
        } else if (newLevel >= 25) {
            state.setAvatarTitle("Scholar");
        } else if (newLevel >= 10) {
            state.setAvatarTitle("Explorer");
        } else {
            state.setAvatarTitle("Beginner Traveler");
        }
    }

    private void checkRegionUpgrades(UserTravelState state) {
        List<JourneyRegion> allRegions = regionRepository.findAllByOrderByOrderIndexAsc();
        if (allRegions.isEmpty()) return;

        JourneyRegion currentRegion = state.getCurrentRegion();
        long currentPoints = state.getTotalTravelPoints();

        // If no region set, set to the first one
        if (currentRegion == null) {
            currentRegion = allRegions.get(0);
            state.setCurrentRegion(currentRegion);
        }

        for (JourneyRegion region : allRegions) {
            // Find the highest region they can unlock
            if (currentPoints >= region.getRequiredPoints() && region.getOrderIndex() > currentRegion.getOrderIndex()) {
                log.info("User {} unlocked new region: {}", state.getUser().getUsername(), region.getName());
                state.setCurrentRegion(region);
                currentRegion = region;
                rewardService.grantRewardsForRegion(state, region);
            }
        }
    }
}
