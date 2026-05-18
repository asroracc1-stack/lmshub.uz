package com.lmscrm.backend.dto.finance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentInitiateRequest {
    private UUID studentId;
    private UUID adminId;
    private Double amount;
    private String paymentProofUrl;
    private String note;
}
