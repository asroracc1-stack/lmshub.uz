package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.dto.admin.SubscriptionPackageDto;
import com.lmscrm.backend.service.admin.SubscriptionPackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/super-admin/packages")
@RequiredArgsConstructor
public class SubscriptionPackageController {

    private final SubscriptionPackageService service;

    @GetMapping
    public ResponseEntity<List<SubscriptionPackageDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<SubscriptionPackageDto> create(@Valid @RequestBody SubscriptionPackageDto dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<SubscriptionPackageDto> update(@PathVariable UUID id, @Valid @RequestBody SubscriptionPackageDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.ok().build();
    }
}
