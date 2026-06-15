package com.lmscrm.backend.domain.entity.gamification;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "travel_mission")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelMission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(name = "required_action")
    private String requiredAction;

    @Column(name = "target_count")
    private Integer targetCount;

    @Column(name = "reward_points")
    private Long rewardPoints;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
}
