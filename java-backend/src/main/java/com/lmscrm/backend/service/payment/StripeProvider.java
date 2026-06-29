package com.lmscrm.backend.service.payment;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.UUID;

@Service
public class StripeProvider implements PaymentProvider {

    @Override
    public String initiatePayment(UUID userId, UUID packId, BigDecimal amount) {
        // Return dummy Stripe checkout session URL
        return "https://checkout.stripe.com/pay/cs_test_" + UUID.randomUUID();
    }

    @Override
    public boolean verifyPayment(String transactionId) {
        return true;
    }

    @Override
    public String getProviderName() {
        return "STRIPE";
    }
}
