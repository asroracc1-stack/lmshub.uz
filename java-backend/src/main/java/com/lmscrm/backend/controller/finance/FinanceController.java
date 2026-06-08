package com.lmscrm.backend.controller.finance;

import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.dto.admin.InvoiceRequestDto;
import com.lmscrm.backend.dto.finance.FinanceDashboardDto;
import com.lmscrm.backend.dto.finance.InvoiceDto;
import com.lmscrm.backend.repository.InvoiceRepository;
import com.lmscrm.backend.service.admin.AdminInvoiceControllerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
@Tag(name = "Finance Controller", description = "Endpoints for Finance Dashboard stats and CRUD management")
public class FinanceController {

    private final InvoiceRepository invoiceRepository;
    private final AdminInvoiceControllerService invoiceService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get Dashboard Stats & Analytics")
    public ResponseEntity<FinanceDashboardDto> getDashboard() {
        BigDecimal totalRevenue = invoiceRepository.sumTotalRevenue();
        BigDecimal pendingAmount = invoiceRepository.sumTotalPending();
        BigDecimal overdueAmount = invoiceRepository.sumTotalOverdue();

        FinanceDashboardDto.DashboardSummary summary = FinanceDashboardDto.DashboardSummary.builder()
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .pendingAmount(pendingAmount != null ? pendingAmount : BigDecimal.ZERO)
                .overdueAmount(overdueAmount != null ? overdueAmount : BigDecimal.ZERO)
                .build();

        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6).withDayOfMonth(1).withHour(0).withMinute(0);
        List<Invoice> recentPaidInvoices = invoiceRepository.findPaidInvoicesSince(sixMonthsAgo);

        Map<String, BigDecimal> monthlyTotals = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM");

        for (int i = 5; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusMonths(i);
            monthlyTotals.put(d.format(formatter), BigDecimal.ZERO);
        }

        if (recentPaidInvoices != null) {
            for (Invoice inv : recentPaidInvoices) {
                if (inv.getPaidAt() != null) {
                    String month = inv.getPaidAt().format(formatter);
                    if (monthlyTotals.containsKey(month)) {
                        monthlyTotals.put(month, monthlyTotals.get(month).add(inv.getAmount()));
                    }
                }
            }
        }

        List<FinanceDashboardDto.MonthlyRevenue> monthlyRevenueList = monthlyTotals.entrySet().stream()
                .map(e -> FinanceDashboardDto.MonthlyRevenue.builder()
                        .month(e.getKey())
                        .amount(e.getValue())
                        .build())
                .collect(Collectors.toList());

        long paidCount = invoiceRepository.countTotalRevenueInvoices();
        long pendingCount = invoiceRepository.countTotalPendingInvoices();
        long overdueCount = invoiceRepository.countTotalOverdueInvoices();

        List<FinanceDashboardDto.StatusDistributionItem> distribution = List.of(
                FinanceDashboardDto.StatusDistributionItem.builder()
                        .status("PAID")
                        .count(paidCount)
                        .amount(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                        .build(),
                FinanceDashboardDto.StatusDistributionItem.builder()
                        .status("PENDING")
                        .count(pendingCount)
                        .amount(pendingAmount != null ? pendingAmount : BigDecimal.ZERO)
                        .build(),
                FinanceDashboardDto.StatusDistributionItem.builder()
                        .status("OVERDUE")
                        .count(overdueCount)
                        .amount(overdueAmount != null ? overdueAmount : BigDecimal.ZERO)
                        .build()
        );

        return ResponseEntity.ok(FinanceDashboardDto.builder()
                .summary(summary)
                .monthlyRevenue(monthlyRevenueList)
                .statusDistribution(distribution)
                .build());
    }

    @GetMapping("/invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get All Invoices with pagination and search query")
    public ResponseEntity<Page<InvoiceDto>> getInvoices(
            @RequestParam(required = false) String query,
            @RequestParam(required = false, defaultValue = "all") String status,
            @PageableDefault(size = 10) Pageable pageable) {
        String normalizedStatus = status;
        if (status != null && !status.equalsIgnoreCase("all")) {
            normalizedStatus = status.toUpperCase();
        } else {
            normalizedStatus = "all";
        }
        return ResponseEntity.ok(invoiceService.getInvoices(query, normalizedStatus, pageable));
    }

    @PostMapping("/invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Create a new Invoice")
    public ResponseEntity<InvoiceDto> createInvoice(@RequestBody InvoiceRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createInvoice(request));
    }

    @PutMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Update an existing Invoice")
    public ResponseEntity<InvoiceDto> updateInvoice(@PathVariable UUID id, @RequestBody InvoiceRequestDto request) {
        return ResponseEntity.ok(invoiceService.updateInvoice(id, request));
    }

    @DeleteMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Delete an Invoice")
    public ResponseEntity<Void> deleteInvoice(@PathVariable UUID id) {
        invoiceService.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/invoices/{id}/paid")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Mark an Invoice as Paid")
    public ResponseEntity<Void> markPaid(@PathVariable UUID id) {
        invoiceService.markAsPaid(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invoices/check-number")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Check if invoice number is available")
    public ResponseEntity<Map<String, Boolean>> checkNumber(@RequestParam String number) {
        return ResponseEntity.ok(Map.of("available", invoiceService.isNumberAvailable(number)));
    }

    @GetMapping("/invoices/next-number")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Get the next available invoice number")
    public ResponseEntity<Map<String, String>> getNextNumber() {
        return ResponseEntity.ok(Map.of("number", invoiceService.generateNextInvoiceNumber()));
    }
}
