package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    List<CalendarEvent> findByOrganizationIdAndStartsAtAfterOrderByStartsAtAsc(UUID organizationId, LocalDateTime now);
    long countByOrganizationId(UUID organizationId);
    long countByOrganizationIdAndCreatedAtBefore(UUID organizationId, LocalDateTime date);

    @org.springframework.data.jpa.repository.Query("SELECT e FROM CalendarEvent e WHERE " +
            "((:orgId IS NULL AND e.organization IS NULL) OR e.organization.id = :orgId) AND " +
            "e.startsAt < :endsAt AND e.endsAt > :startsAt AND (:excludeId IS NULL OR e.id <> :excludeId)")
    List<CalendarEvent> findOverlappingEvents(
            @org.springframework.data.repository.query.Param("orgId") UUID orgId,
            @org.springframework.data.repository.query.Param("startsAt") LocalDateTime startsAt,
            @org.springframework.data.repository.query.Param("endsAt") LocalDateTime endsAt,
            @org.springframework.data.repository.query.Param("excludeId") UUID excludeId
    );
}
