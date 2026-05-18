package com.lmscrm.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPackDto {
    private UUID id;
    private String code;
    private String name;
    private BigDecimal price;
    private Integer duration;
    private List<String> features;
    private Boolean isPopular;
    private String type; // FREE, PRO, ELITE
    private String status; // ACTIVE, INACTIVE
    private Integer totalPurchases;
    private List<UUID> examIds;
}
