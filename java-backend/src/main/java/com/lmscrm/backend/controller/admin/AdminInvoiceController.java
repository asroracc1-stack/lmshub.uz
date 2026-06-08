package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.service.admin.AdminInvoiceControllerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import com.lmscrm.backend.dto.admin.InvoiceRequestDto;

@RestController
@RequestMapping("/api/v1/admin/invoices")
@RequiredArgsConstructor
@Tag(name = "Admin Invoice Controller", description = "Endpoints for SuperAdmin to manage invoices")
public class AdminInvoiceController {

    private final AdminInvoiceControllerService invoiceService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get Invoices with Pagination and Search")
    public ResponseEntity<Page<com.lmscrm.backend.dto.finance.InvoiceDto>> getAll(
            @RequestParam(required = false) String query,
            @RequestParam(required = false, defaultValue = "all") String status,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(invoiceService.getInvoices(query, status, pageable));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<com.lmscrm.backend.dto.finance.InvoiceDto> create(@RequestBody InvoiceRequestDto request) {
        return ResponseEntity.ok(invoiceService.createInvoice(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<com.lmscrm.backend.dto.finance.InvoiceDto> update(@PathVariable UUID id, @RequestBody InvoiceRequestDto request) {
        return ResponseEntity.ok(invoiceService.updateInvoice(id, request));
    }

    @PatchMapping("/{id}/paid")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> markPaid(@PathVariable UUID id) {
        invoiceService.markAsPaid(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        invoiceService.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check-number")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<java.util.Map<String, Boolean>> checkNumber(@RequestParam String number) {
        return ResponseEntity.ok(java.util.Map.of("available", invoiceService.isNumberAvailable(number)));
    }

    @GetMapping("/next-number")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<java.util.Map<String, String>> getNextNumber() {
        return ResponseEntity.ok(java.util.Map.of("number", invoiceService.generateNextInvoiceNumber()));
    }
}
