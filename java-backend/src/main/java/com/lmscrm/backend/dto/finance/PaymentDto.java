package com.lmscrm.backend.dto.finance;

import com.lmscrm.backend.domain.enums.PaymentMethod;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PaymentDto {
    private UUID id;
    private UUID invoiceId;
    private String invoiceNumber;
    private UUID studentId;
    private String studentName;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private String transactionRef;
    private LocalDateTime createdAt;
}
