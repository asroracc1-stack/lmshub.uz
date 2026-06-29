package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.SpeakingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SpeakingSessionRepository extends JpaRepository<SpeakingSession, UUID> {
    List<SpeakingSession> findAllByUserIdOrderByStartTimeDesc(UUID userId);
}
