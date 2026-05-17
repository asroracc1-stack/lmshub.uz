package com.lmscrm.backend.dto.finance;

import com.lmscrm.backend.domain.enums.InvoiceStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class InvoiceDto {
    private UUID id;
    private String invoiceNumber;
    private UUID studentId;
    private String studentName;
    private UUID groupId;
    private String groupName;
    private UUID organizationId;
    private BigDecimal amount;
    private String currency;
    private InvoiceStatus status;
    private String description;
    private LocalDate dueDate;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}
