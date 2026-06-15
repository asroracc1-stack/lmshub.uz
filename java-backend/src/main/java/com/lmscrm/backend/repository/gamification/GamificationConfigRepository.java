package com.lmscrm.backend.repository.gamification;

import com.lmscrm.backend.domain.entity.gamification.GamificationConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GamificationConfigRepository extends JpaRepository<GamificationConfig, UUID> {
    Optional<GamificationConfig> findFirstByActiveTrueOrderByUpdatedAtDesc();
}
