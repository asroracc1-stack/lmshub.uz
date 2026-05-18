package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.SubjectDto;
import com.lmscrm.backend.service.academic.SubjectService;
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
@RequestMapping("/api/v1/admin/subjects")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Admin Subject Controller", description = "Endpoints for managing subjects")
public class AdminSubjectController {

    private final SubjectService subjectService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Get all subjects for organization")
    public ResponseEntity<List<SubjectDto>> getAll(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(subjectService.getAllSubjectsByOrganization(currentUser.getOrganizationId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Create a new subject")
    public ResponseEntity<SubjectDto> create(@RequestBody SubjectDto dto, @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(subjectService.createSubject(dto, currentUser));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Update an existing subject")
    public ResponseEntity<SubjectDto> update(@PathVariable UUID id, @RequestBody SubjectDto dto, @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(subjectService.updateSubject(id, dto, currentUser));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Delete a subject")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        subjectService.deleteSubject(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
