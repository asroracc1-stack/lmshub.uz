package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.CalendarEvent;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.response.DashboardStatsResponse;
import com.lmscrm.backend.service.DashboardService;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard Controller", description = "Endpoints for retrieving organizational dashboard statistics")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ADMINISTRATOR')")
    @Operation(summary = "Get real-time dashboard statistics")
    public ResponseEntity<com.lmscrm.backend.dto.response.AdminDashboardStatsDto> getStats(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(dashboardService.getAdminDashboardStats(currentUser));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ADMINISTRATOR')")
    @Operation(summary = "Get unified dashboard summary")
    public ResponseEntity<DashboardStatsResponse> getSummary(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(dashboardService.getStats(currentUser));
    }

    @GetMapping("/events/upcoming")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ADMINISTRATOR')")
    @Operation(summary = "Get upcoming events for the organization")
    public ResponseEntity<List<CalendarEvent>> getUpcomingEvents(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(dashboardService.getUpcomingEvents(currentUser));
    }

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ADMINISTRATOR')")
    @Operation(summary = "Get consolidated admin dashboard overview info")
    public ResponseEntity<com.lmscrm.backend.dto.response.AdminDashboardOverviewResponse> getOverview(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(dashboardService.getAdminDashboardOverview(currentUser));
    }
}
