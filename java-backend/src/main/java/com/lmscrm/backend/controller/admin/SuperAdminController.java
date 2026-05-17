package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.AuditLog;
import com.lmscrm.backend.repository.AuditLogRepository;
import com.lmscrm.backend.dto.admin.SuperAdminStatsDto;
import com.lmscrm.backend.service.admin.SuperAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/super-admin")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Super Admin Controller", description = "Endpoints for SuperAdmin dashboard and management")
public class SuperAdminController {

    private final SuperAdminService superAdminService;
    private final AuditLogRepository auditLogRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get Dashboard Stats")
    public ResponseEntity<SuperAdminStatsDto> getStats() {
        return ResponseEntity.ok(superAdminService.getDashboardStats());
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get Audit Logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findAll());
    }

    @PostMapping("/grant-coins")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Grant Coins to Regular User")
    public ResponseEntity<Void> grantCoins(@RequestBody GrantCoinsRequest request) {
        superAdminService.grantCoins(request.getUserId(), request.getAmount(), request.getReason());
        return ResponseEntity.ok().build();
    }

    @lombok.Data
    public static class GrantCoinsRequest {
        private java.util.UUID userId;
        private Long amount;
        private String reason;
    }
}
