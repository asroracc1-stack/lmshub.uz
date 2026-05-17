package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.StudentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentAttemptRepository extends JpaRepository<StudentAttempt, UUID> {
    List<StudentAttempt> findByStudentIdOrderByStartedAtDesc(UUID studentId);
    List<StudentAttempt> findByExamId(UUID examId);
    Optional<StudentAttempt> findByExamIdAndStudentId(UUID examId, UUID studentId);
    List<StudentAttempt> findTop5ByStudentIdAndFinishedAtIsNotNullOrderByFinishedAtAsc(UUID studentId);
    
    // Added for stats and daily tasks
    List<StudentAttempt> findAllByStudentId(UUID studentId);
    List<StudentAttempt> findAllByStudentIdAndStartedAtAfter(UUID studentId, LocalDateTime since);
}
