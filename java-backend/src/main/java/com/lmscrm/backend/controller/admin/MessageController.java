package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.admin.MessageDto;
import com.lmscrm.backend.dto.admin.MessageRequestDto;
import com.lmscrm.backend.service.admin.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
@Tag(name = "Message Controller", description = "Endpoints for internal messaging system")
public class MessageController {

    private final MessageService messageService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get Messages for current user")
    public ResponseEntity<List<MessageDto>> getMessages(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(messageService.getMessagesForUser(currentUser.getId()));
    }

    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get Message Statistics")
    public ResponseEntity<Map<String, Long>> getStats(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(messageService.getMessageStats(currentUser.getId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Send a new message")
    public ResponseEntity<MessageDto> sendMessage(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody MessageRequestDto request) {
        return ResponseEntity.ok(messageService.sendMessage(currentUser.getId(), request));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark a message as read")
    public ResponseEntity<MessageDto> markAsRead(@PathVariable UUID id) {
        return ResponseEntity.ok(messageService.markAsRead(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a message")
    public ResponseEntity<Void> deleteMessage(@PathVariable UUID id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }
}
