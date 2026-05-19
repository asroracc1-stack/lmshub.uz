package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.LessonDto;
import com.lmscrm.backend.service.academic.LessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/lessons")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Admin Lesson Controller", description = "Endpoints for managing lessons")
public class LessonController {

    private final LessonService lessonService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Get all lessons for the admin's organization")
    public ResponseEntity<List<LessonDto>> getAll(@AuthenticationPrincipal User currentUser) {
        if (currentUser.getOrganizationId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Tashkilot ID topilmadi!"
            );
        }
        return ResponseEntity.ok(lessonService.getAllLessonsByOrganization(currentUser.getOrganizationId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Get lesson by ID")
    public ResponseEntity<LessonDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonService.getLessonById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Create a new lesson")
    public ResponseEntity<LessonDto> create(@RequestBody LessonDto dto, @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(lessonService.createLesson(dto, currentUser));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Update an existing lesson")
    public ResponseEntity<LessonDto> update(@PathVariable UUID id, @RequestBody LessonDto dto, @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(lessonService.updateLesson(id, dto, currentUser));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Delete a lesson")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        lessonService.deleteLesson(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
