package com.lmscrm.backend.controller.common;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.communication.BroadcastMessageRequest;
import com.lmscrm.backend.dto.communication.ChatMessageDto;
import com.lmscrm.backend.dto.communication.ChatThreadDto;
import com.lmscrm.backend.dto.admin.UserSummaryDto;
import com.lmscrm.backend.service.communication.ChatService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chat Controller", description = "Endpoints for universal chat functionality")
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get my chat threads")
    public ResponseEntity<List<ChatThreadDto>> getMyThreads(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatService.getMyThreads(currentUser.getId()));
    }

    @GetMapping("/conversations/{threadId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get messages for a chat thread")
    public ResponseEntity<List<ChatMessageDto>> getThreadMessages(
            @PathVariable UUID threadId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatService.getThreadMessages(threadId, currentUser.getId()));
    }

    @PostMapping("/conversations/{threadId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Send a message in a chat thread")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @PathVariable UUID threadId,
            @Valid @RequestBody ChatMessageDto request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.sendMessage(threadId, request, currentUser));
    }
    
    @PostMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create or get direct chat thread")
    public ResponseEntity<ChatThreadDto> createDirectThread(
            @RequestBody Map<String, UUID> request,
            @AuthenticationPrincipal User currentUser) {
        UUID targetUserId = request.get("targetUserId");
        if (targetUserId == null) throw new IllegalArgumentException("targetUserId is required");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.createOrGetDirectThread(currentUser, targetUserId));
    }
    
    @GetMapping("/eligible-users")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get users the current user is allowed to message")
    public ResponseEntity<List<UserSummaryDto>> getEligibleUsers(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatService.getEligibleUsers(currentUser));
    }

    @PostMapping("/broadcast")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Send a broadcast message to a group")
    public ResponseEntity<Void> sendBroadcastMessage(
            @Valid @RequestBody BroadcastMessageRequest request,
            @AuthenticationPrincipal User currentUser) {
        chatService.sendBroadcastMessage(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
