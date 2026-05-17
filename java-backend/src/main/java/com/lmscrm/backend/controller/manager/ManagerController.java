package com.lmscrm.backend.controller.manager;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.finance.FinancialAnalyticsDto;
import com.lmscrm.backend.dto.finance.PaymentCreateRequest;
import com.lmscrm.backend.dto.finance.PaymentDto;
import com.lmscrm.backend.service.finance.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/manager")
@RequiredArgsConstructor
public class ManagerController {

    private final PaymentService paymentService;

    // Manager can process payments
    @PostMapping("/finance/payments")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PaymentDto> processPayment(
            @Valid @RequestBody PaymentCreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(paymentService.processPayment(request, user));
    }

    @GetMapping("/finance/analytics")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<FinancialAnalyticsDto> getAnalytics(@RequestParam UUID organizationId) {
        return ResponseEntity.ok(paymentService.getFinancialAnalytics(organizationId));
    }
}
