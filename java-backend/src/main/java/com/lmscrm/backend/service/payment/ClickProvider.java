package com.lmscrm.backend.service.payment;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.UUID;

@Service
public class ClickProvider implements PaymentProvider {

    @Override
    public String initiatePayment(UUID userId, UUID packId, BigDecimal amount) {
        return "https://my.click.uz/services/pay?merchant_id=dummy&service_id=dummy&transaction_param=" + packId;
    }

    @Override
    public boolean verifyPayment(String transactionId) {
        return true;
    }

    @Override
    public String getProviderName() {
        return "CLICK";
    }
}
