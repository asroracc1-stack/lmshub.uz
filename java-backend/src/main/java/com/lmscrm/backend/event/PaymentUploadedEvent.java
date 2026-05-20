package com.lmscrm.backend.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class PaymentUploadedEvent extends ApplicationEvent {

    private final UUID transactionId;

    public PaymentUploadedEvent(Object source, UUID transactionId) {
        super(source);
        this.transactionId = transactionId;
    }
}
