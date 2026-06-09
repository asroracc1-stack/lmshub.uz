package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.StudentFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StudentFeedbackRepository extends JpaRepository<StudentFeedback, UUID> {
    List<StudentFeedback> findByStudentId(UUID studentId);
    List<StudentFeedback> findByTeacherId(UUID teacherId);
    List<StudentFeedback> findByStudentIdOrderByCreatedAtDesc(UUID studentId);
    List<StudentFeedback> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);
}
