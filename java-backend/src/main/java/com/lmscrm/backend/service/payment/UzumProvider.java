package com.lmscrm.backend.service.payment;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.UUID;

@Service
public class UzumProvider implements PaymentProvider {

    @Override
    public String initiatePayment(UUID userId, UUID packId, BigDecimal amount) {
        return "https://uzumbank.uz/pay/dummy-service-id?amount=" + amount + "&userId=" + userId;
    }

    @Override
    public boolean verifyPayment(String transactionId) {
        return true;
    }

    @Override
    public String getProviderName() {
        return "UZUM";
    }
}
