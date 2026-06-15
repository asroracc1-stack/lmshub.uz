package com.lmscrm.backend.domain.entity.gamification;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "gamification_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GamificationConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "test_solved_multiplier")
    @Builder.Default
    private Double testSolvedMultiplier = 5.0;

    @Column(name = "correct_answer_multiplier")
    @Builder.Default
    private Double correctAnswerMultiplier = 2.0;

    @Column(name = "streak_days_multiplier")
    @Builder.Default
    private Double streakDaysMultiplier = 20.0;

    @Column(name = "achievements_multiplier")
    @Builder.Default
    private Double achievementsMultiplier = 50.0;

    @Column(name = "coins_divider")
    @Builder.Default
    private Double coinsDivider = 10.0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
