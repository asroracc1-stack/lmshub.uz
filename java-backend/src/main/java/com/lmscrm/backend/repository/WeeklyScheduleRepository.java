package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.WeeklySchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface WeeklyScheduleRepository extends JpaRepository<WeeklySchedule, UUID> {
    
    List<WeeklySchedule> findByOrganizationId(UUID organizationId);
    
    List<WeeklySchedule> findByGroupId(UUID groupId);

    // Overlap checks for existing schedules (with excludeId)
    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND ws.teacher.id = :teacherId AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime)) AND ws.id <> :excludeId")
    List<WeeklySchedule> findOverlappingForTeacher(
            @Param("orgId") UUID orgId,
            @Param("teacherId") UUID teacherId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") UUID excludeId
    );

    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND ws.group.id = :groupId AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime)) AND ws.id <> :excludeId")
    List<WeeklySchedule> findOverlappingForGroup(
            @Param("orgId") UUID orgId,
            @Param("groupId") UUID groupId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") UUID excludeId
    );

    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND ws.classroom.id = :classroomId AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime)) AND ws.id <> :excludeId")
    List<WeeklySchedule> findOverlappingForClassroom(
            @Param("orgId") UUID orgId,
            @Param("classroomId") UUID classroomId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") UUID excludeId
    );

    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND LOWER(ws.room) = LOWER(:room) AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime)) AND ws.id <> :excludeId")
    List<WeeklySchedule> findOverlappingForRoomName(
            @Param("orgId") UUID orgId,
            @Param("room") String room,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") UUID excludeId
    );

    // Overlap checks for new schedules (without excludeId)
    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND ws.teacher.id = :teacherId AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime))")
    List<WeeklySchedule> findOverlappingForTeacherWithoutExcludeId(
            @Param("orgId") UUID orgId,
            @Param("teacherId") UUID teacherId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND ws.group.id = :groupId AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime))")
    List<WeeklySchedule> findOverlappingForGroupWithoutExcludeId(
            @Param("orgId") UUID orgId,
            @Param("groupId") UUID groupId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND ws.classroom.id = :classroomId AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime))")
    List<WeeklySchedule> findOverlappingForClassroomWithoutExcludeId(
            @Param("orgId") UUID orgId,
            @Param("classroomId") UUID classroomId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    @Query("SELECT ws FROM WeeklySchedule ws WHERE ws.organization.id = :orgId AND LOWER(ws.room) = LOWER(:room) AND ws.dayOfWeek = :dayOfWeek AND " +
           "((ws.startTime < :endTime AND ws.endTime > :startTime))")
    List<WeeklySchedule> findOverlappingForRoomNameWithoutExcludeId(
            @Param("orgId") UUID orgId,
            @Param("room") String room,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );
}
