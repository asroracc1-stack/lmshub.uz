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
    java.util.List<Exam> findByTitle(String title);
    void deleteByTitle(String title);

    @org.springframework.data.jpa.repository.Query("SELECT e FROM Exam e LEFT JOIN FETCH e.passages WHERE e.id = :id")
    java.util.Optional<Exam> findByIdWithPassages(@org.springframework.data.repository.query.Param("id") UUID id);
}
