package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "gamification_settings", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GamificationSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "practice_multiplier", nullable = false)
    @Builder.Default
    private Double practiceMultiplier = 50.0; // 1 minute practice = 50m

    @Column(name = "quiz_multiplier", nullable = false)
    @Builder.Default
    private Double quizMultiplier = 100.0; // 1 quiz = 100m

    @Column(name = "lesson_multiplier", nullable = false)
    @Builder.Default
    private Double lessonMultiplier = 150.0; // 1 lesson = 150m

    @Column(name = "mock_multiplier", nullable = false)
    @Builder.Default
    private Double mockMultiplier = 500.0; // 1 mock = 500m

    @Column(name = "coin_multiplier", nullable = false)
    @Builder.Default
    private Double coinMultiplier = 10.0; // 1 coin = 10m (100 coins = 1km)

    @Column(name = "streak_multiplier", nullable = false)
    @Builder.Default
    private Double streakMultiplier = 200.0; // 1 day streak = 200m

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
