package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.StudentPresenceScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentPresenceScoreRepository extends JpaRepository<StudentPresenceScore, UUID> {
    List<StudentPresenceScore> findBySessionId(UUID sessionId);
    Optional<StudentPresenceScore> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);
}
