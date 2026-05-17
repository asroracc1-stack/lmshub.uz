package com.lmscrm.backend.controller.teacher;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.response.DashboardStatsResponse;
import com.lmscrm.backend.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/teacher/dashboard")
@RequiredArgsConstructor
@Tag(name = "Teacher Dashboard Controller", description = "Endpoints for teachers to view their dashboard statistics")
public class TeacherDashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get teacher dashboard summary")
    public ResponseEntity<Map<String, Object>> getSummary(@AuthenticationPrincipal User currentUser) {
        DashboardStatsResponse stats = dashboardService.getStats(currentUser);
        
        Map<String, Object> summary = new HashMap<>();
        summary.put("myStudents", stats.getStudentsCount());
        summary.put("parentsCount", stats.getParentsCount());
        summary.put("eventsCount", stats.getEventsCount());
        summary.put("groupsCount", stats.getGroupsCount());
        summary.put("assignedExams", 0); // Placeholder for now
        summary.put("pendingGrades", 0); // Placeholder for now
        
        return ResponseEntity.ok(summary);
    }
}
