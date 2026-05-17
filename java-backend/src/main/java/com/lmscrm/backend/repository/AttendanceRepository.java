package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Attendance;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findByLessonId(UUID lessonId);
    List<Attendance> findByStudentId(UUID studentId);
    long countByStudentIdAndStatus(UUID studentId, AttendanceStatus status);
}
