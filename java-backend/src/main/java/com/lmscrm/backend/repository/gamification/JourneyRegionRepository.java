package com.lmscrm.backend.repository.gamification;

import com.lmscrm.backend.domain.entity.gamification.JourneyRegion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JourneyRegionRepository extends JpaRepository<JourneyRegion, UUID> {
    List<JourneyRegion> findAllByOrderByOrderIndexAsc();
}
