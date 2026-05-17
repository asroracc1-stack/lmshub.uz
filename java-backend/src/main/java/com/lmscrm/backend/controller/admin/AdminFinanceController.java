package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.domain.enums.InvoiceStatus;
import com.lmscrm.backend.dto.admin.FinanceStatsDto;
import com.lmscrm.backend.dto.finance.PaymentCreateRequest;
import com.lmscrm.backend.dto.finance.PaymentDto;
import com.lmscrm.backend.repository.InvoiceRepository;
import com.lmscrm.backend.dto.admin.InvoiceRequestDto;
import com.lmscrm.backend.service.admin.AdminInvoiceControllerService;
import com.lmscrm.backend.service.finance.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/finance")
@RequiredArgsConstructor
@Tag(name = "Admin Finance Controller", description = "Endpoints for administrators to manage payments and financial records")
public class AdminFinanceController {

    private final PaymentService paymentService;
    private final AdminInvoiceControllerService invoiceService;
    private final InvoiceRepository invoiceRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get Finance Stats")
    public ResponseEntity<FinanceStatsDto> getStats() {
        BigDecimal totalRevenue = invoiceRepository.sumTotalRevenue();
        BigDecimal pendingAmount = invoiceRepository.sumTotalPending();
        BigDecimal overdueAmount = invoiceRepository.sumTotalOverdue();

        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6).withDayOfMonth(1).withHour(0).withMinute(0);
        List<Invoice> recentPaidInvoices = invoiceRepository.findPaidInvoicesSince(sixMonthsAgo);

        Map<String, BigDecimal> monthlyTotals = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM");
        
        for (int i = 5; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusMonths(i);
            monthlyTotals.put(d.format(formatter), BigDecimal.ZERO);
        }

        for (Invoice inv : recentPaidInvoices) {
            String month = inv.getPaidAt().format(formatter);
            if (monthlyTotals.containsKey(month)) {
                monthlyTotals.put(month, monthlyTotals.get(month).add(inv.getAmount()));
            }
        }

        List<FinanceStatsDto.MonthlyRevenueDto> monthlyRevenueList = monthlyTotals.entrySet().stream()
                .map(e -> FinanceStatsDto.MonthlyRevenueDto.builder()
                        .month(e.getKey())
                        .amount(e.getValue())
                        .build())
                .collect(Collectors.toList());

        FinanceStatsDto stats = FinanceStatsDto.builder()
                .totalRevenue(totalRevenue)
                .pendingAmount(pendingAmount)
                .overdueAmount(overdueAmount)
                .monthlyRevenue(monthlyRevenueList)
                .build();

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get All Invoices")
    public ResponseEntity<Page<com.lmscrm.backend.dto.finance.InvoiceDto>> getInvoices(
            @RequestParam(required = false) String query,
            @RequestParam(required = false, defaultValue = "all") String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(invoiceService.getInvoices(query, status, pageable));
    }

    @PostMapping("/invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Create Invoice")
    public ResponseEntity<com.lmscrm.backend.dto.finance.InvoiceDto> createInvoice(@RequestBody InvoiceRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createInvoice(request));
    }

    @PutMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Update Invoice")
    public ResponseEntity<com.lmscrm.backend.dto.finance.InvoiceDto> updateInvoice(@PathVariable UUID id, @RequestBody InvoiceRequestDto request) {
        return ResponseEntity.ok(invoiceService.updateInvoice(id, request));
    }

    @DeleteMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Delete Invoice")
    public ResponseEntity<Void> deleteInvoice(@PathVariable UUID id) {
        invoiceService.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get All Payments")
    public ResponseEntity<Page<PaymentDto>> getAllPayments(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(paymentService.getAllPayments(pageable));
    }

    @PostMapping("/payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    @Operation(
            summary = "Process Manual Payment",
            description = "Allows an Admin or Manager to process and record a manual payment for a student's invoice."
    )
    public ResponseEntity<PaymentDto> processPayment(
            @Valid @RequestBody PaymentCreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.processPayment(request, user));
    }
}
