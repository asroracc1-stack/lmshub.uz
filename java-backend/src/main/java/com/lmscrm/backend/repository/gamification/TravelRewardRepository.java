package com.lmscrm.backend.repository.gamification;

import com.lmscrm.backend.domain.entity.gamification.TravelReward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TravelRewardRepository extends JpaRepository<TravelReward, UUID> {
    List<TravelReward> findAllByRegionId(UUID regionId);
}
