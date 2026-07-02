package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.AttendanceEngineSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceEngineSessionRepository extends JpaRepository<AttendanceEngineSession, UUID> {
    Optional<AttendanceEngineSession> findByLessonId(UUID lessonId);
    boolean existsByLessonId(UUID lessonId);
}
