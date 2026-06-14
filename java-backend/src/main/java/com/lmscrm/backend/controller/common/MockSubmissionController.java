package com.lmscrm.backend.controller.common;

import com.lmscrm.backend.dto.exam.ExamResultDto;
import com.lmscrm.backend.dto.exam.ExamSubmitRequest;
import com.lmscrm.backend.service.exam.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.lmscrm.backend.domain.entity.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/exams")
@RequiredArgsConstructor
public class MockSubmissionController {

    private final ExamService examService;

    @PostMapping("/submit")
    public ResponseEntity<ExamResultDto> submitExam(
            @RequestBody ExamSubmitRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.submitExam(request, user));
    }
}
