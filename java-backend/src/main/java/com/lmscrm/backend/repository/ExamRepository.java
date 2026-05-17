package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {
    List<Exam> findByOrganizationId(UUID organizationId);
    List<Exam> findBySubjectId(UUID subjectId);
    List<Exam> findByTypeOrderByCreatedAtDesc(com.lmscrm.backend.domain.enums.ExamType type);
    boolean existsByTitle(String title);
}
