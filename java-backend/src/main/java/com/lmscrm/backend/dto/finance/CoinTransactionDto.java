package com.lmscrm.backend.dto.finance;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CoinTransactionDto {
    private UUID id;
    private UUID studentId;
    private String studentName;
    private Integer amount;
    private String reason;
    private String source;
    private LocalDateTime createdAt;
}
