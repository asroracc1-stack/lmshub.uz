package com.lmscrm.backend.controller.student;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.finance.CoinTransactionDto;
import com.lmscrm.backend.dto.finance.InvoiceDto;
import com.lmscrm.backend.dto.finance.PaymentDto;
import com.lmscrm.backend.service.finance.CoinService;
import com.lmscrm.backend.service.finance.InvoiceService;
import com.lmscrm.backend.service.finance.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/student/finance")
@RequiredArgsConstructor
public class StudentFinanceController {

    private final InvoiceService invoiceService;
    private final PaymentService paymentService;
    private final CoinService coinService;

    // Student can only see their own invoices
    @GetMapping("/invoices")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<InvoiceDto>> getMyInvoices(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invoiceService.getStudentInvoices(user.getId()));
    }

    // Student can only see their own payments
    @GetMapping("/payments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<PaymentDto>> getMyPayments(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(paymentService.getStudentPayments(user.getId()));
    }

    // Student can see their coin history
    @GetMapping("/coins/history")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<CoinTransactionDto>> getMyCoinHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(coinService.getStudentCoinHistory(user.getId()));
    }

    // Student can see their total coin balance
    @GetMapping("/coins/balance")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Integer> getMyCoinBalance(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(coinService.getStudentBalance(user.getId()));
    }
}
