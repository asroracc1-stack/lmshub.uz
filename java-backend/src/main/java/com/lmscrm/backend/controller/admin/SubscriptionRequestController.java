package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.SubscriptionRequest;
import com.lmscrm.backend.service.SubscriptionRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/subscription-requests")
@RequiredArgsConstructor
public class SubscriptionRequestController {

    private final SubscriptionRequestService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PACK_MANAGER')")
    public List<SubscriptionRequest> getAll() {
        return service.getAllRequests();
    }

    @PostMapping("/{requestId}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PACK_MANAGER')")
    public ResponseEntity<?> approve(@PathVariable UUID requestId, Authentication auth) {
        service.approveRequest(requestId, auth.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{requestId}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'PACK_MANAGER')")
    public ResponseEntity<?> reject(@PathVariable UUID requestId, @RequestBody(required = false) Map<String, String> body, Authentication auth) {
        String reason = null;
        if (body != null && body.containsKey("reason")) {
            reason = body.get("reason");
        }
        service.rejectRequest(requestId, auth.getName(), reason);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody Map<String, String> body, Authentication auth) {
        UUID packId = UUID.fromString(body.get("pack_id"));
        String receiptUrl = body.get("receipt_url");
        service.createRequest(auth.getName(), packId, receiptUrl);
        return ResponseEntity.ok().build();
    }
}
