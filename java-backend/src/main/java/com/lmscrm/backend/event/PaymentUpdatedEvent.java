package com.lmscrm.backend.event;

import org.springframework.context.ApplicationEvent;
import java.util.UUID;

public class PaymentUpdatedEvent extends ApplicationEvent {
    private final UUID transactionId;

    public PaymentUpdatedEvent(Object source, UUID transactionId) {
        super(source);
        this.transactionId = transactionId;
    }

    public UUID getTransactionId() {
        return transactionId;
    }
}
