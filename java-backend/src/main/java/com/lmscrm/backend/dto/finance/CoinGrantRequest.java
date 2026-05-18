package com.lmscrm.backend.dto.finance;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoinGrantRequest {

    @NotNull(message = "Foydalanuvchi ID kiritilishi shart")
    private UUID studentId;

    @NotNull(message = "Coin miqdori kiritilishi shart")
    private Integer amount;

    @NotNull(message = "Sabab kiritilishi shart")
    private String reason;

    private String comment;
}
