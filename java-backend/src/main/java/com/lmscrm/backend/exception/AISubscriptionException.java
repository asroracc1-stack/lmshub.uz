package com.lmscrm.backend.exception;

import lombok.Getter;

@Getter
public class AISubscriptionException extends RuntimeException {
    private final String error;
    private final boolean upgradeAvailable;

    public AISubscriptionException(String message, String error, boolean upgradeAvailable) {
        super(message);
        this.error = error;
        this.upgradeAvailable = upgradeAvailable;
    }
}
