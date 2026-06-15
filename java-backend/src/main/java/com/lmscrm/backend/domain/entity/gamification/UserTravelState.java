package com.lmscrm.backend.domain.entity.gamification;

import com.lmscrm.backend.domain.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_travel_state")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTravelState {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "total_travel_points", nullable = false)
    @Builder.Default
    private Long totalTravelPoints = 0L;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_region_id")
    private JourneyRegion currentRegion;

    @Column(name = "avatar_level", nullable = false)
    @Builder.Default
    private Integer avatarLevel = 1;

    @Column(name = "avatar_title")
    @Builder.Default
    private String avatarTitle = "Beginner Traveler";

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
