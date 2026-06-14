package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "gamification_checkpoints", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GamificationCheckpoint {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "target_distance", nullable = false)
    private Double targetDistance; // in meters

    @Column(name = "reward_type", nullable = false)
    private String rewardType; // REWARD_CHEST, COIN_BOX, PREMIUM_MOCK_TEST, FREE_PACK, XP_BOOST, SPECIAL_BADGE, SPECIAL_ACHIEVEMENT

    @Column(name = "reward_value")
    private String rewardValue; // e.g. "100" coins or item IDs

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (active == null) active = true;
    }
}
