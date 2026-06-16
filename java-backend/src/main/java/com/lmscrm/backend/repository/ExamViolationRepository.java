package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.ExamViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ExamViolationRepository extends JpaRepository<ExamViolation, UUID> {
    List<ExamViolation> findByAttemptIdOrderByTimestampAsc(UUID attemptId);
}
