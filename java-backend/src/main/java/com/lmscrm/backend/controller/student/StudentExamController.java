package com.lmscrm.backend.controller.student;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.exam.ExamDto;
import com.lmscrm.backend.dto.exam.QuestionDto;
import com.lmscrm.backend.dto.exam.StudentAttemptDto;
import com.lmscrm.backend.dto.exam.SubmitExamRequest;
import com.lmscrm.backend.service.exam.ExamService;
import com.lmscrm.backend.service.exam.StudentAttemptService;
import com.lmscrm.backend.service.GeminiService;
import com.lmscrm.backend.dto.exam.ParseAiRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/student/exams")
@RequiredArgsConstructor
@Tag(name = "Student Exam Controller", description = "Endpoints for students to take exams and view their results")
public class StudentExamController {

    private final ExamService examService;
    private final StudentAttemptService attemptService;
    private final GeminiService geminiService;

    @PostMapping("/grade")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Instant AI Grading", description = "Uses AI to immediately grade Writing or Speaking responses.")
    public ResponseEntity<String> gradeMock(@RequestBody ParseAiRequest request) {
        return ResponseEntity.ok(geminiService.analyzeIeltsWriting(request.getText(), request.getTaskType() != null ? request.getTaskType() : "IELTS Writing"));
    }


    @GetMapping("/{examId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(
            summary = "Get Exam Details",
            description = "Returns metadata about an exam (duration, passing score, etc.) before the student starts it."
    )
    public ResponseEntity<ExamDto> getExamDetails(@PathVariable UUID examId) {
        return ResponseEntity.ok(examService.getExamDetails(examId));
    }

    @PostMapping("/{examId}/start")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(
            summary = "Start Exam",
            description = "Creates a new exam attempt for the student, recording the start time. Checks if the exam is currently active."
    )
    public ResponseEntity<StudentAttemptDto> startExam(
            @PathVariable UUID examId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attemptService.startExam(examId, user));
    }

    @GetMapping("/{examId}/questions")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(
            summary = "Get Exam Questions",
            description = "Returns the list of questions and options for an exam. IMPORTANT: Correct answers are hidden from the student."
    )
    public ResponseEntity<List<QuestionDto>> getExamQuestions(
            @PathVariable UUID examId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.getExamQuestions(examId, user, true));
    }

    @PostMapping("/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(
            summary = "Submit Exam",
            description = "Submits the student's selected answers, auto-grades the exam, updates their score, and applies gamification logic if passed."
    )
    public ResponseEntity<StudentAttemptDto> submitExam(
            @Valid @RequestBody SubmitExamRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(attemptService.submitExam(request, user));
    }

    @GetMapping("/attempts")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(
            summary = "Get My Exam Attempts",
            description = "Returns the history of all exams the student has taken, along with their scores and pass/fail status."
    )
    public ResponseEntity<List<StudentAttemptDto>> getMyAttempts(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(attemptService.getMyAttempts(user.getId()));
    }

    @DeleteMapping("/{examId}/attempt")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Delete My Exam Attempt (Retake)", description = "Deletes the student's attempt and answers for a specific exam to allow retaking it.")
    public ResponseEntity<Void> deleteMyAttempt(
            @PathVariable UUID examId,
            @AuthenticationPrincipal User user) {
        attemptService.deleteAttempt(examId, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{examId}/result")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Get Completed Exam Result", description = "Retrieves the graded result details for a completed exam attempt.")
    public ResponseEntity<com.lmscrm.backend.dto.exam.ExamResultDto> getExamResult(
            @PathVariable UUID examId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.getExamResult(examId, user));
    }

    @GetMapping("/attempts/{attemptId}/result")
    @PreAuthorize("hasAnyRole('STUDENT', 'USER')")
    @Operation(summary = "Get Completed Exam Result by Attempt ID", description = "Retrieves the graded result details for a specific completed exam attempt.")
    public ResponseEntity<com.lmscrm.backend.dto.exam.ExamResultDto> getExamResultByAttemptId(
            @PathVariable UUID attemptId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(examService.getExamResultByAttemptId(attemptId, user));
    }
}
