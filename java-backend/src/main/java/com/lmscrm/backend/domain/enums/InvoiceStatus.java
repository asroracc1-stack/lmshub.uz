package com.lmscrm.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonFormat;

@JsonFormat(with = JsonFormat.Feature.ACCEPT_CASE_INSENSITIVE_PROPERTIES)
public enum InvoiceStatus {
    DRAFT,
    PENDING,
    SENT,
    PAID,
    OVERDUE,
    CANCELLED
}
