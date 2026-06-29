package com.lmscrm.backend.service.payment;

import java.math.BigDecimal;
import java.util.UUID;

public interface PaymentProvider {
    String initiatePayment(UUID userId, UUID packId, BigDecimal amount);
    boolean verifyPayment(String transactionId);
    String getProviderName();
}
