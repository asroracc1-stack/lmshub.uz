package com.lmscrm.backend.controller.admin;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;

@RestController
@RequestMapping("/api/v1/admin/system")
@RequiredArgsConstructor
@Tag(name = "System Controller", description = "System health and management endpoints")
public class SystemController {

    @GetMapping("/health")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get System Health Status")
    public ResponseEntity<SystemHealthDto> getHealth() {
        long uptimeMillis = ManagementFactory.getRuntimeMXBean().getUptime();
        long hours = uptimeMillis / (1000 * 60 * 60);
        long minutes = (uptimeMillis / (1000 * 60)) % 60;
        
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
        
        SystemHealthDto health = new SystemHealthDto();
        health.setStatus("Online");
        health.setUptime(hours + "s " + minutes + "d");
        health.setMemoryUsage(usedMemory + " MB");
        // Mocking active sessions for stateless JWT architecture
        health.setActiveSessions( (int) (Math.random() * 15) + 1 );

        return ResponseEntity.ok(health);
    }

    @PostMapping("/clear-cache")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Clear System Cache")
    public ResponseEntity<Void> clearCache() {
        // Mock cache clearing
        System.gc(); // Suggest garbage collection as a mock cache clear
        return ResponseEntity.ok().build();
    }

    @Data
    public static class SystemHealthDto {
        private String status;
        private String uptime;
        private String memoryUsage;
        private int activeSessions;
    }
}
