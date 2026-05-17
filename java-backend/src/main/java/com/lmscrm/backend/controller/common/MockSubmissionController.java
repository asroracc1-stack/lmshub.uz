package com.lmscrm.backend.controller.common;

import com.lmscrm.backend.dto.exam.ExamResultDto;
import com.lmscrm.backend.dto.exam.ExamSubmitRequest;
import com.lmscrm.backend.service.exam.ExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/exams")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
public class MockSubmissionController {

    private final ExamService examService;

    @PostMapping("/submit")
    public ResponseEntity<ExamResultDto> submitExam(@RequestBody ExamSubmitRequest request) {
        return ResponseEntity.ok(examService.submitExam(request));
    }
}
