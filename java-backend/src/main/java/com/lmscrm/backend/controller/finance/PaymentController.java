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
    @PreAuthorize("hasAnyRole('STUDENT','PARENT','SUPER_ADMIN','ADMIN','ADMINISTRATOR','USER')")
    @Operation(summary = "Get list of admins available for receiving payments")
    public ResponseEntity<List<AdminPaymentInfoDto>> getAdmins(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal User currentUser) {
        UUID effectiveOrgId = organizationId != null ? organizationId : currentUser.getOrganizationId();
        return ResponseEntity.ok(paymentTransactionService.getAdminsForPayment(effectiveOrgId));
    }

    @GetMapping("/organization-cards")
    @PreAuthorize("hasAnyRole('STUDENT','PARENT','SUPER_ADMIN','ADMIN','ADMINISTRATOR','USER')")
    public ResponseEntity<List<AdminPaymentInfoDto>> getOrganizationCards(
            @RequestParam(required = false) UUID organizationId,
            @AuthenticationPrincipal User currentUser) {
        UUID effectiveOrgId = organizationId != null ? organizationId : currentUser.getOrganizationId();
        return ResponseEntity.ok(paymentTransactionService.getAdminsForPayment(effectiveOrgId));
    }

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('STUDENT','PARENT','USER')")
    @Operation(summary = "Initiate a payment request with proof URL")
    public ResponseEntity<PaymentTransactionDto> initiatePayment(
            @RequestBody PaymentInitiateRequest req,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(paymentTransactionService.initiatePayment(req, currentUser));
    }

    @PostMapping("/upload-receipt")
    @PreAuthorize("hasAnyRole('STUDENT','PARENT','USER')")
    public ResponseEntity<PaymentTransactionDto> uploadReceipt(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam("amount") Double amount,
            @RequestParam("adminId") UUID adminId,
            @RequestParam(value = "studentId", required = false) UUID studentId,
            @RequestParam(value = "note", required = false) String note,
            @AuthenticationPrincipal User currentUser
    ) throws java.io.IOException {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        java.nio.file.Path root = java.nio.file.Paths.get("uploads/receipts");
        if (!java.nio.file.Files.exists(root)) java.nio.file.Files.createDirectories(root);

        String filename = java.util.UUID.randomUUID() + "-" + file.getOriginalFilename();
        java.nio.file.Path target = root.resolve(filename);
        java.nio.file.Files.copy(file.getInputStream(), target);

        String publicUrl = "/api/v1/files/view/receipts/" + filename;

        // Build request and forward to service
        PaymentInitiateRequest req = PaymentInitiateRequest.builder()
                .adminId(adminId)
                .studentId(studentId != null ? studentId : currentUser.getId())
                .amount(amount)
                .paymentProofUrl(publicUrl)
                .note(note)
                .build();

        PaymentTransactionDto dto = paymentTransactionService.initiatePayment(req, currentUser);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('STUDENT','PARENT','USER')")
    @Operation(summary = "Get current user's payment history")
    public ResponseEntity<List<PaymentTransactionDto>> getHistory(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(paymentTransactionService.getHistory(currentUser));
    }
}
