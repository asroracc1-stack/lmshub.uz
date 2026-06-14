package com.lmscrm.backend.controller.support;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.FeedbackStatus;
import com.lmscrm.backend.dto.communication.BroadcastMessageRequest;
import com.lmscrm.backend.dto.communication.FeedbackDto;
import com.lmscrm.backend.service.communication.ChatService;
import com.lmscrm.backend.service.communication.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/support")
@RequiredArgsConstructor
public class SupportController {

    private final ChatService chatService;
    private final FeedbackService feedbackService;

    // Support can send broadcast messages
    @PostMapping("/broadcast")
    @PreAuthorize("hasRole('SUPPORT')")
    public ResponseEntity<Void> sendSupportBroadcast(
            @Valid @RequestBody BroadcastMessageRequest request,
            @AuthenticationPrincipal User user) {
        chatService.sendBroadcastMessage(request, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/feedbacks")
    @PreAuthorize("hasRole('SUPPORT')")
    public ResponseEntity<List<FeedbackDto>> getAllFeedbacks(@RequestParam(required = false) FeedbackStatus status) {
        return ResponseEntity.ok(feedbackService.getAllFeedbacks(status));
    }

    @PatchMapping("/feedbacks/{id}/status")
    @PreAuthorize("hasRole('SUPPORT')")
    public ResponseEntity<FeedbackDto> updateFeedbackStatus(
            @PathVariable UUID id,
            @RequestParam FeedbackStatus status,
            @RequestParam(required = false) String comment) {
        return ResponseEntity.ok(feedbackService.updateFeedbackStatus(id, status, comment));
    }

    @PostMapping("/feedback")
    public ResponseEntity<FeedbackDto> createFeedback(
            @RequestBody java.util.Map<String, String> payload,
            @AuthenticationPrincipal User user) {
        String subject = payload.get("subject");
        String message = payload.get("message");
        if (message == null || message.trim().isEmpty()) {
            throw new IllegalArgumentException("Message cannot be empty");
        }
        return ResponseEntity.ok(feedbackService.createFeedback(subject, message, user));
    }
}
