package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "pricing_plans", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "price_monthly")
    private BigDecimal priceMonthly;

    @Column(name = "price_yearly")
    private BigDecimal priceYearly;

    private String currency;

    @Column(name = "price_suffix")
    private String priceSuffix;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "pricing_plan_features", joinColumns = @JoinColumn(name = "plan_id"))
    @Column(name = "feature")
    private java.util.List<String> features;

    @Column(name = "cta_label")
    private String ctaLabel;

    @Column(name = "cta_link")
    private String ctaLink;

    @Column(name = "is_popular")
    private Boolean isPopular;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "sort_order")
    private Integer sortOrder;
}
