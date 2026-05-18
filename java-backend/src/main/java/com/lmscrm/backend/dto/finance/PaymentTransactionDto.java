package com.lmscrm.backend.dto.finance;

import com.lmscrm.backend.domain.enums.PaymentTransactionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransactionDto {
    private UUID id;
    private UUID studentId;
    private String studentName;
    private UUID payerId;
    private String payerName;
    private UUID adminId;
    private String adminName;
    private Double amount;
    private String paymentProofUrl;
    private PaymentTransactionStatus status;
    private UUID organizationId;
    private String note;
    private LocalDateTime createdAt;
}
