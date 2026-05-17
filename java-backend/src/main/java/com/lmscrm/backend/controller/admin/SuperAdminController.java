package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.AuditLog;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.AuditLogRepository;
import com.lmscrm.backend.dto.admin.SuperAdminStatsDto;
import com.lmscrm.backend.dto.auth.LoginResponse;
import com.lmscrm.backend.service.admin.SuperAdminService;
import com.lmscrm.backend.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final AuthService authService;

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

    // ─── SuperAdmin o'z profilini yangilash (username/parol) ─────────────────
    @PutMapping("/profile")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "SuperAdmin o'z username va parolini yangilashi")
    public ResponseEntity<LoginResponse> updateMyProfile(
            @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal User currentUser) {
        LoginResponse response = authService.updateSuperAdminProfile(
                request.getUsername(), request.getPassword(), currentUser);
        return ResponseEntity.ok(response);
    }

    @lombok.Data
    public static class GrantCoinsRequest {
        private java.util.UUID userId;
        private Long amount;
        private String reason;
    }

    @lombok.Data
    public static class UpdateProfileRequest {
        private String username;
        private String password;
    }
}
