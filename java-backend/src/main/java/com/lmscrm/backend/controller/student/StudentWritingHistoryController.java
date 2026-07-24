package com.lmscrm.backend.controller.student;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.dto.exam.ReadingHistoryItemDto;
import com.lmscrm.backend.dto.exam.ReadingStatisticsDto;
import com.lmscrm.backend.service.exam.StudentAttemptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/writing")
@RequiredArgsConstructor
@Tag(name = "Student Writing History Controller", description = "Endpoints for students to view their writing attempts history and statistics")
public class StudentWritingHistoryController {

    private final StudentAttemptService attemptService;

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Get Completed Writing Attempts History (Paginated)")
    public ResponseEntity<Page<ReadingHistoryItemDto>> getWritingHistory(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(attemptService.getExamHistory(user, ExamType.WRITING, pageable));
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Get Writing Mock Overall Statistics")
    public ResponseEntity<ReadingStatisticsDto> getWritingStatistics(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(attemptService.getExamStatistics(user, ExamType.WRITING));
    }

    @DeleteMapping("/history/{attemptId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Delete Writing Mock Attempt History Item")
    public ResponseEntity<Void> deleteWritingAttempt(
            @AuthenticationPrincipal User user,
            @PathVariable UUID attemptId) {
        attemptService.deleteAttemptById(attemptId, user);
        return ResponseEntity.noContent().build();
    }
}
