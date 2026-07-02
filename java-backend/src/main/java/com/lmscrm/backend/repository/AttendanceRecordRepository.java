package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.AttendanceRecord;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {
    Optional<AttendanceRecord> findByLessonIdAndStudentId(UUID lessonId, UUID studentId);
    List<AttendanceRecord> findByStudentId(UUID studentId);
    List<AttendanceRecord> findByLessonIdIn(List<UUID> lessonIds);
    long countByStudentIdAndStatus(UUID studentId, AttendanceStatus status);

    @Query("SELECT ar FROM AttendanceRecord ar WHERE ar.organization.id = :orgId AND ar.campus.id = :campusId")
    List<AttendanceRecord> findByCampus(@Param("orgId") UUID orgId, @Param("campusId") UUID campusId);
}
