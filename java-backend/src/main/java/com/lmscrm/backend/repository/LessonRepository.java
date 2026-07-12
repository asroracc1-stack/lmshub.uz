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
    // Talabaning guruh orqali darslarini olish
    @org.springframework.data.jpa.repository.Query(
        "SELECT DISTINCT l FROM Lesson l " +
        "LEFT JOIN GroupMember gm ON l.group.id = gm.group.id AND gm.student.id = :studentId " +
        "WHERE (gm.student.id = :studentId OR l.group.id = (SELECT u.groupId FROM User u WHERE u.id = :studentId)) " +
        "ORDER BY l.startsAt ASC"
    )
    List<Lesson> findAllByStudentId(@org.springframework.data.repository.query.Param("studentId") UUID studentId);

    // Existing query for room overlap, used when updating an existing lesson
    @org.springframework.data.jpa.repository.Query("SELECT l FROM Lesson l WHERE " +
            "l.organization.id = :orgId AND " +
            "l.room = :room AND " +
            "l.room IS NOT NULL AND l.room <> '' AND " +
            "l.startsAt < :endsAt AND l.endsAt > :startsAt AND " +
            "l.id <> :excludeId") // Removed IS NULL check, assume excludeId is never null here
    List<Lesson> findOverlappingLessonsByRoom(
            @org.springframework.data.repository.query.Param("orgId") UUID orgId,
            @org.springframework.data.repository.query.Param("room") String room,
            @org.springframework.data.repository.query.Param("startsAt") LocalDateTime startsAt,
            @org.springframework.data.repository.query.Param("endsAt") LocalDateTime endsAt,
            @org.springframework.data.repository.query.Param("excludeId") UUID excludeId
    );

    // New query for room overlap, used when creating a new lesson (no excludeId)
    @org.springframework.data.jpa.repository.Query("SELECT l FROM Lesson l WHERE " +
            "l.organization.id = :orgId AND " +
            "l.room = :room AND " +
            "l.room IS NOT NULL AND l.room <> '' AND " +
            "l.startsAt < :endsAt AND l.endsAt > :startsAt")
    List<Lesson> findOverlappingLessonsByRoomWithoutExcludeId(
            @org.springframework.data.repository.query.Param("orgId") UUID orgId,
            @org.springframework.data.repository.query.Param("room") String room,
            @org.springframework.data.repository.query.Param("startsAt") LocalDateTime startsAt,
            @org.springframework.data.repository.query.Param("endsAt") LocalDateTime endsAt
    );

    // Existing query for teacher overlap, used when updating an existing lesson
    @org.springframework.data.jpa.repository.Query("SELECT l FROM Lesson l WHERE " +
            "l.organization.id = :orgId AND " +
            "l.teacher.id = :teacherId AND " +
            "l.startsAt < :endsAt AND l.endsAt > :startsAt AND " +
            "l.id <> :excludeId") // Removed IS NULL check, assume excludeId is never null here
    List<Lesson> findOverlappingLessonsByTeacher(
            @org.springframework.data.repository.query.Param("orgId") UUID orgId,
            @org.springframework.data.repository.query.Param("teacherId") UUID teacherId,
            @org.springframework.data.repository.query.Param("startsAt") LocalDateTime startsAt,
            @org.springframework.data.repository.query.Param("endsAt") LocalDateTime endsAt,
            @org.springframework.data.repository.query.Param("excludeId") UUID excludeId
    );

    // New query for teacher overlap, used when creating a new lesson (no excludeId)
    @org.springframework.data.jpa.repository.Query("SELECT l FROM Lesson l WHERE " +
            "l.organization.id = :orgId AND " +
            "l.teacher.id = :teacherId AND " +
            "l.startsAt < :endsAt AND l.endsAt > :startsAt")
    List<Lesson> findOverlappingLessonsByTeacherWithoutExcludeId(
            @org.springframework.data.repository.query.Param("orgId") UUID orgId,
            @org.springframework.data.repository.query.Param("teacherId") UUID teacherId,
            @org.springframework.data.repository.query.Param("startsAt") LocalDateTime startsAt,
            @org.springframework.data.repository.query.Param("endsAt") LocalDateTime endsAt
    );

    java.util.Optional<Lesson> findFirstByGroupIdAndStartsAtBeforeAndEndsAtAfter(UUID groupId, LocalDateTime now1, LocalDateTime now2);
    List<Lesson> findByClassroomIdAndStartsAtBeforeAndEndsAtAfter(UUID classroomId, LocalDateTime now1, LocalDateTime now2);
}