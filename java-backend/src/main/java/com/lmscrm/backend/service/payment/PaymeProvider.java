package com.lmscrm.backend.service.payment;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.UUID;

@Service
public class PaymeProvider implements PaymentProvider {

    @Override
    public String initiatePayment(UUID userId, UUID packId, BigDecimal amount) {
        return "https://checkout.paycom.uz/pay/" + UUID.randomUUID().toString().substring(0, 8);
    }

    @Override
    public boolean verifyPayment(String transactionId) {
        return true;
    }

    @Override
    public String getProviderName() {
        return "PAYME";
    }
}
