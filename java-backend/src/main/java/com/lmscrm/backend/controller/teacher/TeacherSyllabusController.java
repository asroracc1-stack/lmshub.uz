package com.lmscrm.backend.controller.teacher;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.LessonDto;
import com.lmscrm.backend.dto.academic.SubjectDto;
import com.lmscrm.backend.service.academic.LessonService;
import com.lmscrm.backend.service.academic.SubjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
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
    public ResponseEntity<LessonDto> createLesson(
            @Valid @RequestBody LessonDto request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(lessonService.createLesson(request, currentUser));
    }

    @PutMapping("/lessons/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Update an existing lesson/syllabus topic")
    public ResponseEntity<LessonDto> updateLesson(
            @PathVariable UUID id,
            @Valid @RequestBody LessonDto request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(lessonService.updateLesson(id, request, currentUser));
    }

    @DeleteMapping("/lessons/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Delete a lesson/syllabus topic")
    public ResponseEntity<Void> deleteLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {
        lessonService.deleteLesson(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
