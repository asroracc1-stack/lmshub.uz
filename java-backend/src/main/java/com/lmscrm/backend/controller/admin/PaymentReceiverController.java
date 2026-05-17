package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.PaymentReceiver;
import com.lmscrm.backend.repository.PaymentReceiverRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

import com.lmscrm.backend.service.admin.PaymentReceiverService;
import com.lmscrm.backend.dto.admin.PaymentReceiverDto;

@RestController
@RequestMapping("/api/v1/payment-receivers")
@RequiredArgsConstructor
@Tag(name = "Payment Receiver Controller", description = "Endpoints for managing payment systems like Click, Payme, etc.")
public class PaymentReceiverController {

    private final PaymentReceiverService service;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get All Payment Receivers")
    public ResponseEntity<List<PaymentReceiverDto>> getAll(@RequestParam(required = false) String query) {
        return ResponseEntity.ok(service.getAllReceivers(query));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create Payment Receiver")
    public ResponseEntity<PaymentReceiverDto> create(@Valid @RequestBody PaymentReceiver receiver) {
        return ResponseEntity.ok(service.createReceiver(receiver));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<PaymentReceiverDto> update(@PathVariable UUID id, @Valid @RequestBody PaymentReceiver details) {
        return ResponseEntity.ok(service.updateReceiver(id, details));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteReceiver(id);
        return ResponseEntity.noContent().build();
    }
}
