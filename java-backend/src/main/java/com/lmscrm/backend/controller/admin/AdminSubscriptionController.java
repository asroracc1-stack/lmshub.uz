package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.SubscriptionPack;
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
@RequestMapping("/api/v1/admin/packs")
@RequiredArgsConstructor
@Tag(name = "Admin Subscription Controller", description = "Endpoints for managing subscription packages")
public class AdminSubscriptionController {

    private final SubscriptionPackService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PACK_MANAGER')")
    @Operation(summary = "Get all subscription packs")
    public ResponseEntity<List<SubscriptionPack>> getAll() {
        return ResponseEntity.ok(service.getAllPacks());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create a new subscription pack")
    public ResponseEntity<SubscriptionPack> create(@RequestBody SubscriptionPack pack) {
        return ResponseEntity.ok(service.createPack(pack));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PACK_MANAGER')")
    @Operation(summary = "Update an existing subscription pack")
    public ResponseEntity<SubscriptionPack> update(@PathVariable UUID id, @RequestBody SubscriptionPack details) {
        return ResponseEntity.ok(service.updatePack(id, details));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete a subscription pack")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deletePack(id);
        return ResponseEntity.noContent().build();
    }
}
