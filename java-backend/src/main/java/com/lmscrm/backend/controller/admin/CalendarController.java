package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.CalendarEvent;
import com.lmscrm.backend.repository.CalendarEventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import com.lmscrm.backend.exception.BusinessException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
@Tag(name = "Calendar Controller", description = "Endpoints for managing calendar events")
public class CalendarController {

    private final CalendarEventRepository calendarEventRepository;

    @GetMapping
    @Operation(summary = "Get All Events")
    public ResponseEntity<List<CalendarEvent>> getAll() {
        return ResponseEntity.ok(calendarEventRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR')")
    public ResponseEntity<CalendarEvent> create(@Valid @RequestBody CalendarEvent event) {
        if (event.getStartsAt() == null || event.getEndsAt() == null) {
            throw new IllegalArgumentException("Boshlanish va tugash vaqti majburiy");
        }
        UUID orgId = event.getOrganization() != null ? event.getOrganization().getId() : null;
        List<CalendarEvent> overlaps = orgId != null
                ? calendarEventRepository.findByOrganizationIdAndStartsAtLessThanAndEndsAtGreaterThan(orgId, event.getEndsAt(), event.getStartsAt())
                : calendarEventRepository.findByOrganizationIsNullAndStartsAtLessThanAndEndsAtGreaterThan(event.getEndsAt(), event.getStartsAt());
        
        if (!overlaps.isEmpty()) {
            throw new BusinessException("Ushbu vaqtda boshqa tadbir mavjud");
        }
        return ResponseEntity.ok(calendarEventRepository.save(event));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR')")
    public ResponseEntity<CalendarEvent> update(@PathVariable UUID id, @Valid @RequestBody CalendarEvent details) {
        CalendarEvent event = calendarEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        if (details.getStartsAt() == null || details.getEndsAt() == null) {
            throw new IllegalArgumentException("Boshlanish va tugash vaqti majburiy");
        }
        UUID orgId = details.getOrganization() != null ? details.getOrganization().getId() : null;
        List<CalendarEvent> overlaps = orgId != null
                ? calendarEventRepository.findByOrganizationIdAndStartsAtLessThanAndEndsAtGreaterThan(orgId, details.getEndsAt(), details.getStartsAt())
                : calendarEventRepository.findByOrganizationIsNullAndStartsAtLessThanAndEndsAtGreaterThan(details.getEndsAt(), details.getStartsAt());
        
        overlaps.removeIf(e -> e.getId().equals(id));
        if (!overlaps.isEmpty()) {
            throw new BusinessException("Ushbu vaqtda boshqa tadbir mavjud");
        }

        event.setTitle(details.getTitle());
        event.setDescription(details.getDescription());
        event.setLocation(details.getLocation());
        event.setStartsAt(details.getStartsAt());
        event.setEndsAt(details.getEndsAt());
        event.setIsAllDay(details.getIsAllDay());
        event.setType(details.getType());
        event.setColor(details.getColor());
        return ResponseEntity.ok(calendarEventRepository.save(event));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        calendarEventRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
