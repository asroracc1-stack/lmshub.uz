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
    private BigDecimal oldPrice;
    private Integer discountPercent;
    private Integer duration;
    private Integer durationDays;
    private String colorAndDesign;
    private String icon;
    private Boolean accessAllMocks;
    private Boolean accessSatMocks;
    private Boolean accessNatMocks;
    private Boolean accessIeltsMocks;
    private Boolean accessCustomMocks;
    private Boolean accessAllBooks;
    private List<String> features;
    private Boolean isPopular;
    private String type; // FREE, PRO, ELITE
    private String status; // ACTIVE, INACTIVE
    private Integer totalPurchases;
    private List<UUID> examIds;
    private List<UUID> allowedBookIds;
}
