package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.GroupDto;
import com.lmscrm.backend.service.academic.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/groups")
@RequiredArgsConstructor
@Tag(name = "Admin Group Controller", description = "Endpoints for managing groups")
public class AdminGroupController {

    private final GroupService groupService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER','STUDENT','PARENT')")
    @Operation(summary = "Get all groups with pagination")
    public ResponseEntity<Page<GroupDto>> getAll(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.getAllGroups(query, pageable, currentUser));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Create a new group")
    public ResponseEntity<GroupDto> create(
            @RequestBody GroupDto dto,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.createGroup(dto, currentUser));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Update a group")
    public ResponseEntity<GroupDto> update(
            @PathVariable UUID id,
            @RequestBody GroupDto dto,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.updateGroup(id, dto, currentUser));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Delete a group")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {
        groupService.deleteGroup(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
