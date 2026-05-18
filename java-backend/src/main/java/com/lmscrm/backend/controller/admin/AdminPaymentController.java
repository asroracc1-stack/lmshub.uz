package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.finance.PaymentTransactionDto;
import com.lmscrm.backend.service.finance.PaymentTransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/payments/manage")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Admin Payment Controller", description = "Endpoints for Admins to manage payment requests")
public class AdminPaymentController {

    private final PaymentTransactionService paymentTransactionService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Get payment requests for admin's organization")
    public ResponseEntity<Page<PaymentTransactionDto>> getTransactions(
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        UUID effectiveOrgId = currentUser.getRole() == AppRole.SUPER_ADMIN && organizationId != null
                ? organizationId
                : currentUser.getOrganizationId();
        return ResponseEntity.ok(paymentTransactionService.getTransactionsForAdmin(effectiveOrgId, status, pageable));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Approve a payment request")
    public ResponseEntity<PaymentTransactionDto> approve(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(paymentTransactionService.approveTransaction(id, currentUser));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Reject a payment request")
    public ResponseEntity<PaymentTransactionDto> reject(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(paymentTransactionService.rejectTransaction(id, currentUser));
    }
}
