package com.lmscrm.backend.domain.entity.gamification;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "travel_reward")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelReward {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id", nullable = false)
    private JourneyRegion region;

    @Column(name = "coin_amount")
    @Builder.Default
    private Integer coinAmount = 0;

    @Column(name = "xp_amount")
    @Builder.Default
    private Integer xpAmount = 0;

    @Column(name = "badge_name")
    private String badgeName;

    @Column(name = "is_grand_prize")
    @Builder.Default
    private Boolean isGrandPrize = false;
}
