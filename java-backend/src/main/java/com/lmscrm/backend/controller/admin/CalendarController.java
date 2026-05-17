package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.CalendarEvent;
import com.lmscrm.backend.repository.CalendarEventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Calendar Controller", description = "Endpoints for managing calendar events")
public class CalendarController {

    private final CalendarEventRepository calendarEventRepository;

    @GetMapping
    @Operation(summary = "Get All Events")
    public ResponseEntity<List<CalendarEvent>> getAll() {
        return ResponseEntity.ok(calendarEventRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<CalendarEvent> create(@RequestBody CalendarEvent event) {
        return ResponseEntity.ok(calendarEventRepository.save(event));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<CalendarEvent> update(@PathVariable UUID id, @RequestBody CalendarEvent details) {
        CalendarEvent event = calendarEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        calendarEventRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
