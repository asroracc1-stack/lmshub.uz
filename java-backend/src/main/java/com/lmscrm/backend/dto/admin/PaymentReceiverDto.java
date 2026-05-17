package com.lmscrm.backend.dto.admin;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentReceiverDto {
    private UUID id;
    private String fullName;
    private String cardNumber;
    private String cardHolder;
    private String telegramUsername;
    private String telegramChatId;
    private String paymentPurpose;
    private Boolean active;
    private Boolean isDefault;
    private OrganizationDto organization;
    private LocalDateTime createdAt;
}
