package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findByGroupIdOrderByStartsAtAsc(UUID groupId);
    List<Lesson> findByTeacherIdAndStartsAtBetweenOrderByStartsAtAsc(UUID teacherId, LocalDateTime start, LocalDateTime end);
}
