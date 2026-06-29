package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.SpeakingScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpeakingScoreRepository extends JpaRepository<SpeakingScore, UUID> {
    Optional<SpeakingScore> findBySessionId(UUID sessionId);
}
