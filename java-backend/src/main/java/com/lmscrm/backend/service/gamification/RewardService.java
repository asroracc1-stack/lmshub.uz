package com.lmscrm.backend.service.gamification;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.gamification.JourneyRegion;
import com.lmscrm.backend.domain.entity.gamification.TravelReward;
import com.lmscrm.backend.domain.entity.gamification.UserTravelState;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.gamification.TravelRewardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardService {

    private final TravelRewardRepository travelRewardRepository;
    private final UserRepository userRepository;

    @Transactional
    public void grantRewardsForRegion(UserTravelState state, JourneyRegion region) {
        List<TravelReward> rewards = travelRewardRepository.findAllByRegionId(region.getId());
        User user = state.getUser();

        for (TravelReward reward : rewards) {
            if (reward.getCoinAmount() != null && reward.getCoinAmount() > 0) {
                user.setCoins(user.getCoins() + reward.getCoinAmount());
                log.info("User {} granted {} coins for reaching region {}", user.getId(), reward.getCoinAmount(), region.getName());
            }
            if (reward.getXpAmount() != null && reward.getXpAmount() > 0) {
                user.setXp(user.getXp() + reward.getXpAmount());
                log.info("User {} granted {} XP for reaching region {}", user.getId(), reward.getXpAmount(), region.getName());
            }
            if (reward.getBadgeName() != null && !reward.getBadgeName().isEmpty()) {
                // Here you would typically link badge to user_achievements table.
                // Assuming it's tracked in another way or we just log it for now.
                log.info("User {} unlocked badge: {} for reaching region {}", user.getId(), reward.getBadgeName(), region.getName());
            }
            if (reward.getIsGrandPrize() != null && reward.getIsGrandPrize()) {
                log.info("User {} earned GRAND PRIZE for reaching region {}", user.getId(), region.getName());
            }
        }
        userRepository.save(user);
    }
}
