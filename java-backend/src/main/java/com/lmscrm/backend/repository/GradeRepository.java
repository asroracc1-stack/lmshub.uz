package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GradeRepository extends JpaRepository<Grade, UUID> {
    List<Grade> findByStudentId(UUID studentId);
    List<Grade> findByLessonId(UUID lessonId);
    Optional<Grade> findByLessonIdAndStudentId(UUID lessonId, UUID studentId);
    List<Grade> findByStudentIdAndSubjectId(UUID studentId, UUID subjectId);
    List<Grade> findByStudentIdInAndSubjectId(List<UUID> studentIds, UUID subjectId);
    List<Grade> findByTeacherId(UUID teacherId);
}
