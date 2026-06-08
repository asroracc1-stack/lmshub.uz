package com.lmscrm.backend.controller.teacher;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.LessonDto;
import com.lmscrm.backend.dto.academic.SubjectDto;
import com.lmscrm.backend.service.academic.LessonService;
import com.lmscrm.backend.service.academic.SubjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher Syllabus Controller", description = "Endpoints for teachers to manage subjects and lessons/syllabus")
public class TeacherSyllabusController {

    private final SubjectService subjectService;
    private final LessonService lessonService;

    @GetMapping("/subjects")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Get all subjects for the organization")
    public ResponseEntity<List<SubjectDto>> getSubjects(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(subjectService.getAllSubjectsByOrganization(currentUser.getOrganizationId()));
    }

    @GetMapping("/lessons/group/{groupId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Get all lessons/syllabus topics for a group")
    public ResponseEntity<List<LessonDto>> getLessonsByGroup(@PathVariable UUID groupId) {
        return ResponseEntity.ok(lessonService.getLessonsByGroup(groupId));
    }

    @PostMapping("/lessons")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Create a new lesson/syllabus topic")
    public ResponseEntity<?> createLesson(
            @RequestBody LessonDto request,
            @AuthenticationPrincipal User currentUser) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(lessonService.createLesson(request, currentUser));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Dars yaratishda xatolik: " + e.getMessage()));
        }
    }

    @PutMapping("/lessons/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Update an existing lesson/syllabus topic")
    public ResponseEntity<?> updateLesson(
            @PathVariable UUID id,
            @RequestBody LessonDto request,
            @AuthenticationPrincipal User currentUser) {
        try {
            return ResponseEntity.ok(lessonService.updateLesson(id, request, currentUser));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Darsni yangilashda xatolik: " + e.getMessage()));
        }
    }

    @DeleteMapping("/lessons/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Delete a lesson/syllabus topic")
    public ResponseEntity<?> deleteLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {
        try {
            lessonService.deleteLesson(id, currentUser);
            return ResponseEntity.noContent().build();
        } catch (org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Darsni o'chirishda xatolik: " + e.getMessage()));
        }
    }
}
