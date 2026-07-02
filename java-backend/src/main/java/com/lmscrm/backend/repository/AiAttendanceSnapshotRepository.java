package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.AiAttendanceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AiAttendanceSnapshotRepository extends JpaRepository<AiAttendanceSnapshot, UUID> {
    List<AiAttendanceSnapshot> findByLessonIdOrderByCapturedAtDesc(UUID lessonId);
    List<AiAttendanceSnapshot> findByProcessingStatus(String processingStatus);
}
