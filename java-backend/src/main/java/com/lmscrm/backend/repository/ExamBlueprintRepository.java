package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.ExamBlueprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamBlueprintRepository extends JpaRepository<ExamBlueprint, UUID> {
    Optional<ExamBlueprint> findByExamId(UUID examId);
}
