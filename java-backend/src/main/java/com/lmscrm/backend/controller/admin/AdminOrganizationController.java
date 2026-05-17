package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.admin.OrganizationDto;
import com.lmscrm.backend.service.admin.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/organization")
@RequiredArgsConstructor
@Tag(name = "Admin Organization Controller", description = "Endpoints for Org Admin to manage their own organization settings")
public class AdminOrganizationController {

    private final OrganizationService organizationService;

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get current organization settings")
    public ResponseEntity<OrganizationDto> getSettings(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(organizationService.getOrganizationById(currentUser.getOrganizationId()));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update organization settings")
    public ResponseEntity<OrganizationDto> updateSettings(
            @AuthenticationPrincipal User currentUser,
            @RequestBody OrganizationDto dto) {
        return ResponseEntity.ok(organizationService.updateOrganization(currentUser.getOrganizationId(), dto));
    }
}
