package com.lmscrm.backend.dto.admin;

import com.lmscrm.backend.domain.enums.InvoiceStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceRequestDto {
    private String invoiceNumber;
    private UUID organizationId;
    private UUID studentId;
    private UUID groupId;
    private BigDecimal amount;
    private String currency;
    private InvoiceStatus status;
    private String description;
    private LocalDate dueDate;
}
