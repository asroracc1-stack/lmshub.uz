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
}
