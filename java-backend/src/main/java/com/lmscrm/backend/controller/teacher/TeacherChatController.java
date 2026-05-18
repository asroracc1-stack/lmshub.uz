package com.lmscrm.backend.controller.teacher;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.communication.BroadcastMessageRequest;
import com.lmscrm.backend.dto.communication.ChatMessageDto;
import com.lmscrm.backend.dto.communication.ChatThreadDto;
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

@RestController
@RequestMapping("/api/v1/teacher/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Teacher Chat Controller", description = "Endpoints for teachers to chat with students and parents")
public class TeacherChatController {

    private final ChatService chatService;

    @GetMapping("/threads")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Get my chat threads")
    public ResponseEntity<List<ChatThreadDto>> getMyThreads(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatService.getMyThreads(currentUser.getId()));
    }

    @GetMapping("/threads/{threadId}/messages")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Get messages for a chat thread")
    public ResponseEntity<List<ChatMessageDto>> getThreadMessages(
            @PathVariable UUID threadId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(chatService.getThreadMessages(threadId, currentUser.getId()));
    }

    @PostMapping("/threads/{threadId}/messages")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'TEACHER')")
    @Operation(summary = "Send a message in a chat thread")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @PathVariable UUID threadId,
            @Valid @RequestBody ChatMessageDto request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.sendMessage(threadId, request, currentUser));
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
