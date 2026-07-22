package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.ImportLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ImportLogRepository extends JpaRepository<ImportLog, UUID> {
    List<ImportLog> findByExamIdOrderByImportedAtDesc(UUID examId);
    List<ImportLog> findByImportedByOrderByImportedAtDesc(UUID userId);
    List<ImportLog> findByStatusOrderByImportedAtDesc(String status);
}
