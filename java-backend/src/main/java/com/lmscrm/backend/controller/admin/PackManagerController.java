package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.dto.admin.SubscriptionPackDto;
import com.lmscrm.backend.service.SubscriptionPackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pack-manager/packages")
@RequiredArgsConstructor
@Tag(name = "Pack Manager Controller", description = "Endpoints for Pack Managers to administer Subscription Packages")
public class PackManagerController {

    private final SubscriptionPackService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all subscription packages")
    public ResponseEntity<List<SubscriptionPackDto>> getAll() {
        return ResponseEntity.ok(service.getAllPacksDto());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PACK_MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Create a new subscription package")
    public ResponseEntity<SubscriptionPackDto> create(@RequestBody SubscriptionPackDto dto) {
        return ResponseEntity.ok(service.createPackDto(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PACK_MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Update an existing subscription package")
    public ResponseEntity<SubscriptionPackDto> update(@PathVariable UUID id, @RequestBody SubscriptionPackDto dto) {
        return ResponseEntity.ok(service.updatePackDto(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PACK_MANAGER', 'SUPER_ADMIN')")
    @Operation(summary = "Delete a subscription package")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deletePack(id);
        return ResponseEntity.noContent().build();
    }
}
