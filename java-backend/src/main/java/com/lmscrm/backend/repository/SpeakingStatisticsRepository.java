package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.SpeakingStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpeakingStatisticsRepository extends JpaRepository<SpeakingStatistics, UUID> {
    Optional<SpeakingStatistics> findByUserId(UUID userId);
}
