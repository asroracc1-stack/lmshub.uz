package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.CalendarEvent;
import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.CalendarEventRepository;
import com.lmscrm.backend.repository.OrganizationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/events")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Event Controller", description = "Endpoints for managing admin events")
public class EventController {

    private final CalendarEventRepository calendarEventRepository;
    private final OrganizationRepository organizationRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR')")
    @Operation(summary = "Create an event")
    public ResponseEntity<CalendarEvent> create(@RequestBody CreateEventRequest req,
                                               @AuthenticationPrincipal User currentUser) {
        if (req.getEventDate() == null) {
            throw new IllegalArgumentException("eventDate must not be null");
        }

        UUID orgId = currentUser.getOrganizationId();
        Organization org = null;
        if (orgId != null) {
            org = organizationRepository.findById(orgId).orElse(null);
        }

        LocalDateTime startsAt = req.getEventDate().toLocalDateTime();

        CalendarEvent event = CalendarEvent.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .startsAt(startsAt)
                .endsAt(startsAt.plusHours(1))
                .organization(org)
                .createdBy(currentUser)
                .isAllDay(false)
                .type("event")
                .color("#8b5cf6") // Premium violet color
                .build();

        return ResponseEntity.ok(calendarEventRepository.save(event));
    }

    @Data
    public static class CreateEventRequest {
        private String title;
        private String description;
        private java.time.OffsetDateTime eventDate;
    }
}
