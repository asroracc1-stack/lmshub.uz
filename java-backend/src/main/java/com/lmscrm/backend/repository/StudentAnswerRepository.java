package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, UUID> {
    List<StudentAnswer> findByAttemptId(UUID attemptId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM StudentAnswer sa WHERE sa.attempt.id = :attemptId")
    void deleteByAttemptId(@org.springframework.data.repository.query.Param("attemptId") UUID attemptId);
}
