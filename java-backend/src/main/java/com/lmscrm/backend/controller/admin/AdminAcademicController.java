package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.dto.academic.GroupDto;
import com.lmscrm.backend.service.academic.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Admin Academic Controller", description = "Endpoints for administrators to manage overarching academic entities like groups")
public class AdminAcademicController {

    private final GroupService groupService;

    @GetMapping("/organizations/{orgId}/groups")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(
            summary = "Get All Groups by Organization",
            description = "Returns a list of all groups belonging to a specific organization. Requires SUPER_ADMIN or ADMIN role."
    )
    public ResponseEntity<List<GroupDto>> getAllGroups(@PathVariable UUID orgId) {
        return ResponseEntity.ok(groupService.getAllGroupsByOrganization(orgId));
    }
}
