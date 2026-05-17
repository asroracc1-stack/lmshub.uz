package com.lmscrm.backend.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class StudentNotificationEvent {
    private final String parentTelegramUsername;
    private final String message;
}
