package com.lmscrm.backend.dto.finance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPaymentInfoDto {
    private UUID id;
    private String fullName;
    private String cardNumber;
    private String cardHolder;
    private String role;
    private String telegramUsername;
}
