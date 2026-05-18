package com.lmscrm.backend.controller.common;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.communication.BroadcastMessageRequest;
import com.lmscrm.backend.dto.communication.ChatMessageDto;
import com.lmscrm.backend.dto.communication.ChatThreadDto;
import com.lmscrm.backend.dto.communication.NotificationDto;
import com.lmscrm.backend.service.communication.ChatService;
import com.lmscrm.backend.service.communication.NotificationService;
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
@RequestMapping("/api/v1/communication")
@RequiredArgsConstructor
@Tag(name = "Communication Controller", description = "Endpoints for Chat Threads, Messages, and Notifications")
public class CommunicationController {

    private final ChatService chatService;
    private final NotificationService notificationService;

    @GetMapping("/threads")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get My Chat Threads",
            description = "Returns a list of all chat threads (rooms) the authenticated user is a participant of."
    )
    public ResponseEntity<List<ChatThreadDto>> getMyThreads(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getMyThreads(user.getId()));
    }

    @GetMapping("/threads/{threadId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get Thread Messages",
            description = "Returns all messages in a specific chat thread. Fails if the user is not a participant."
    )
    public ResponseEntity<List<ChatMessageDto>> getThreadMessages(
            @PathVariable UUID threadId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getThreadMessages(threadId, user.getId()));
    }

    @PostMapping("/threads/{threadId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Send Chat Message",
            description = "Sends a new message to a specific thread and triggers offline notifications to other participants."
    )
    public ResponseEntity<ChatMessageDto> sendMessage(
            @PathVariable UUID threadId,
            @RequestBody @Valid ChatMessageDto request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.sendMessage(threadId, request, user));
    }

    @PostMapping("/broadcast")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(
            summary = "Send Broadcast Message",
            description = "Allows an Admin or Teacher to send a message that appears as a notification to all members of a group."
    )
    public ResponseEntity<Void> sendBroadcastMessage(
            @Valid @RequestBody BroadcastMessageRequest request,
            @AuthenticationPrincipal User user) {
        chatService.sendBroadcastMessage(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/notifications")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get My Notifications",
            description = "Returns all system notifications for the user. Supports filtering by unread status."
    )
    public ResponseEntity<List<NotificationDto>> getMyNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getMyNotifications(user.getId(), unreadOnly));
    }

    @PutMapping("/notifications/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Mark Notification as Read",
            description = "Updates the status of a specific notification to 'read'."
    )
    public ResponseEntity<Void> markNotificationAsRead(
            @PathVariable UUID notificationId,
            @AuthenticationPrincipal User user) {
        notificationService.markAsRead(notificationId, user.getId());
        return ResponseEntity.ok().build();
    }
}
