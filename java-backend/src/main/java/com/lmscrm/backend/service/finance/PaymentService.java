package com.lmscrm.backend.service.finance;

import com.lmscrm.backend.domain.entity.Invoice;
import com.lmscrm.backend.domain.entity.Payment;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.InvoiceStatus;
import com.lmscrm.backend.dto.finance.*;
import com.lmscrm.backend.exception.BusinessException;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.FinanceMapper;
import com.lmscrm.backend.repository.InvoiceRepository;
import com.lmscrm.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final CoinService coinService;
    private final FinanceMapper mapper;

    @Transactional(readOnly = true)
    public Page<PaymentDto> getAllPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(mapper::toPaymentDto);
    }

    @Transactional
    public PaymentDto processPayment(PaymentCreateRequest request, User processedBy) {
        Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BusinessException("Invoice is already paid");
        }

        // Create Payment
        Payment payment = Payment.builder()
                .invoice(invoice)
                .student(invoice.getStudent())
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .transactionRef(request.getTransactionRef())
                .processedBy(processedBy)
                .organization(invoice.getOrganization())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // Calculate remaining amount logic here...
        // For simplicity, assuming full payment changes status to PAID
        if (request.getAmount().compareTo(invoice.getAmount()) >= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(LocalDateTime.now());
            invoiceRepository.save(invoice);

            // Gamification logic: Add bonus coins for full payment
            coinService.addCoins(
                    invoice.getStudent(),
                    50,
                    "On-time invoice payment",
                    "PAYMENT_BONUS",
                    processedBy
            );
        }

        return mapper.toPaymentDto(savedPayment);
    }

    @Transactional(readOnly = true)
    public List<PaymentDto> getStudentPayments(UUID studentId) {
        return paymentRepository.findByStudentId(studentId).stream()
                .map(mapper::toPaymentDto)
                .collect(Collectors.toList());
    }

    public FinancialAnalyticsDto getFinancialAnalytics(UUID organizationId) {
        BigDecimal totalRevenue = paymentRepository.sumTotalRevenueByOrganizationId(organizationId);
        BigDecimal pendingPayments = invoiceRepository.sumPendingPaymentsByOrganizationId(organizationId);
        List<MonthlyRevenue> monthlyRevenue = paymentRepository.getMonthlyRevenueByOrganizationId(organizationId);

        return FinancialAnalyticsDto.builder()
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .pendingPayments(pendingPayments != null ? pendingPayments : BigDecimal.ZERO)
                .monthlyRevenue(monthlyRevenue)
                .build();
    }
}
