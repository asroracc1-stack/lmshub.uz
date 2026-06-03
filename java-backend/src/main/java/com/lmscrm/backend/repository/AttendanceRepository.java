package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Attendance;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findByLessonId(UUID lessonId);
    List<Attendance> findByLessonIdIn(List<UUID> lessonIds);
    List<Attendance> findByStudentId(UUID studentId);
    Optional<Attendance> findByLessonIdAndStudentId(UUID lessonId, UUID studentId);
    List<Attendance> findByStudentIdAndLessonIdIn(UUID studentId, List<UUID> lessonIds);
    long countByStudentIdAndStatus(UUID studentId, AttendanceStatus status);
}
