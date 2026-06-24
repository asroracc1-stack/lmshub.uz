package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.PracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PracticeSessionRepository extends JpaRepository<PracticeSession, UUID> {
    List<PracticeSession> findAllByUserIdAndCreatedAtAfter(UUID userId, LocalDateTime since);
    List<PracticeSession> findAllByUserId(UUID userId);
    List<PracticeSession> findAllByUserIdInAndCreatedAtAfter(List<UUID> userIds, LocalDateTime since);
}

