package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "subscription_packs", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPack {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer duration; // in months

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "subscription_pack_features", joinColumns = @JoinColumn(name = "pack_id"))
    @Column(name = "feature")
    @Builder.Default
    private List<String> features = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "subscription_pack_exams",
        joinColumns = @JoinColumn(name = "pack_id"),
        inverseJoinColumns = @JoinColumn(name = "exam_id")
    )
    @Builder.Default
    private List<Exam> exams = new ArrayList<>();

    @Column(name = "is_popular")
    @Builder.Default
    private Boolean isPopular = false;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PackType type; // FREE, PRO, ELITE

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    @Column(nullable = false)
    @Builder.Default
    private Integer totalPurchases = 0;

    public enum PackType {
        FREE, PRO, ELITE
    }
}
