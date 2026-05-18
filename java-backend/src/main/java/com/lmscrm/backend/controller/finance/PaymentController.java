package com.lmscrm.backend.controller.finance;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.finance.AdminPaymentInfoDto;
import com.lmscrm.backend.dto.finance.PaymentInitiateRequest;
import com.lmscrm.backend.dto.finance.PaymentTransactionDto;
import com.lmscrm.backend.service.finance.PaymentTransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController("financePaymentController")
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Payment Controller", description = "Endpoints for students/parents to initiate payments")
public class PaymentController {

    private final PaymentTransactionService paymentTransactionService;

    @GetMapping("/initiate/admins")
    @PreAuthorize("hasAnyRole('STUDENT','PARENT','SUPER_ADMIN','ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Get list of admins available for receiving payments")
    public ResponseEntity<List<AdminPaymentInfoDto>> getAdmins(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal User currentUser) {
        UUID effectiveOrgId = organizationId != null ? organizationId : currentUser.getOrganizationId();
        return ResponseEntity.ok(paymentTransactionService.getAdminsForPayment(effectiveOrgId));
    }

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('STUDENT','PARENT')")
    @Operation(summary = "Initiate a payment request with proof URL")
    public ResponseEntity<PaymentTransactionDto> initiatePayment(
            @RequestBody PaymentInitiateRequest req,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(paymentTransactionService.initiatePayment(req, currentUser));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('STUDENT','PARENT')")
    @Operation(summary = "Get current user's payment history")
    public ResponseEntity<List<PaymentTransactionDto>> getHistory(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(paymentTransactionService.getHistory(currentUser));
    }
}
