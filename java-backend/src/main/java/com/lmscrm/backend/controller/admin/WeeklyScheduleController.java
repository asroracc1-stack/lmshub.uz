package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.WeeklyScheduleDto;
import com.lmscrm.backend.service.academic.WeeklyScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/weekly-schedules")
@RequiredArgsConstructor
@Tag(name = "Admin Weekly Schedule Controller", description = "Endpoints for managing weekly timetables (Dars jadvali)")
public class WeeklyScheduleController {

    private final WeeklyScheduleService weeklyScheduleService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Get all weekly schedule slots for the admin's organization")
    public ResponseEntity<List<WeeklyScheduleDto>> getAll(@AuthenticationPrincipal User currentUser) {
        if (currentUser.getOrganizationId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tashkilot ID topilmadi!");
        }
        return ResponseEntity.ok(weeklyScheduleService.getSchedulesByOrganization(currentUser.getOrganizationId()));
    }

    @GetMapping("/group/{groupId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER','STUDENT','PARENT')")
    @Operation(summary = "Get weekly schedule slots for a specific group")
    public ResponseEntity<List<WeeklyScheduleDto>> getByGroupId(@PathVariable UUID groupId) {
        return ResponseEntity.ok(weeklyScheduleService.getSchedulesByGroup(groupId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Create a new weekly schedule slot")
    public ResponseEntity<?> create(@RequestBody WeeklyScheduleDto dto, @AuthenticationPrincipal User currentUser) {
        try {
            return ResponseEntity.ok(weeklyScheduleService.createSchedule(dto, currentUser));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Jadval yaratishda xatolik: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Update an existing weekly schedule slot")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody WeeklyScheduleDto dto, @AuthenticationPrincipal User currentUser) {
        try {
            return ResponseEntity.ok(weeklyScheduleService.updateSchedule(id, dto, currentUser));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Jadvalni yangilashda xatolik: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Delete a weekly schedule slot")
    public ResponseEntity<?> delete(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        try {
            weeklyScheduleService.deleteSchedule(id, currentUser);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Jadvalni o'chirishda xatolik: " + e.getMessage()));
        }
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Generate concrete lesson events from weekly template schedule")
    public ResponseEntity<?> generateLessons(
            @RequestParam("start_date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("end_date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser.getOrganizationId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tashkilot ID topilmadi!");
        }
        try {
            int count = weeklyScheduleService.generateLessonsFromSchedule(currentUser.getOrganizationId(), startDate, endDate, currentUser);
            return ResponseEntity.ok(Map.of(
                "message", "Darslar muvaffaqiyatli generatsiya qilindi!",
                "count", count
            ));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Darslarni generatsiya qilishda xatolik: " + e.getMessage()));
        }
    }
}
