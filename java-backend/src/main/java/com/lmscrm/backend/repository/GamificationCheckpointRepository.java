package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.GamificationCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface GamificationCheckpointRepository extends JpaRepository<GamificationCheckpoint, UUID> {
    List<GamificationCheckpoint> findAllByActiveTrueOrderByTargetDistanceAsc();
}
