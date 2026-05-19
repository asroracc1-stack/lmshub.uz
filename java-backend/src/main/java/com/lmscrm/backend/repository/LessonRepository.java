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
    long countByTeacherId(UUID teacherId);
    List<Lesson> findByOrganizationIdOrderByStartsAtDesc(UUID organizationId);

    @org.springframework.data.jpa.repository.Query("SELECT l FROM Lesson l WHERE " +
            "l.organization.id = :orgId AND " +
            "l.room = :room AND " +
            "l.room IS NOT NULL AND l.room <> '' AND " +
            "l.startsAt < :endsAt AND l.endsAt > :startsAt AND " +
            "(:excludeId IS NULL OR l.id <> :excludeId)")
    List<Lesson> findOverlappingLessonsByRoom(
            @org.springframework.data.repository.query.Param("orgId") UUID orgId,
            @org.springframework.data.repository.query.Param("room") String room,
            @org.springframework.data.repository.query.Param("startsAt") LocalDateTime startsAt,
            @org.springframework.data.repository.query.Param("endsAt") LocalDateTime endsAt,
            @org.springframework.data.repository.query.Param("excludeId") UUID excludeId
    );

    @org.springframework.data.jpa.repository.Query("SELECT l FROM Lesson l WHERE " +
            "l.organization.id = :orgId AND " +
            "l.teacher.id = :teacherId AND " +
            "l.startsAt < :endsAt AND l.endsAt > :startsAt AND " +
            "(:excludeId IS NULL OR l.id <> :excludeId)")
    List<Lesson> findOverlappingLessonsByTeacher(
            @org.springframework.data.repository.query.Param("orgId") UUID orgId,
            @org.springframework.data.repository.query.Param("teacherId") UUID teacherId,
            @org.springframework.data.repository.query.Param("startsAt") LocalDateTime startsAt,
            @org.springframework.data.repository.query.Param("endsAt") LocalDateTime endsAt,
            @org.springframework.data.repository.query.Param("excludeId") UUID excludeId
    );
}
