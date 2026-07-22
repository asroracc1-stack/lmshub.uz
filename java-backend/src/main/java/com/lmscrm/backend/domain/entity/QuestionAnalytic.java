package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "question_analytics", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionAnalytic {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    private Question question;

    @Column(name = "difficulty_index", nullable = false)
    @Builder.Default
    private Double difficultyIndex = 0.0;

    @Column(name = "discrimination_index", nullable = false)
    @Builder.Default
    private Double discriminationIndex = 0.0;

    @Column(name = "average_time_ms", nullable = false)
    @Builder.Default
    private Long averageTimeMs = 0L;

    @Column(name = "correct_count", nullable = false)
    @Builder.Default
    private Integer correctCount = 0;

    @Column(name = "wrong_count", nullable = false)
    @Builder.Default
    private Integer wrongCount = 0;

    @Column(name = "skip_count", nullable = false)
    @Builder.Default
    private Integer skipCount = 0;

    @Column(name = "ai_quality_score", nullable = false)
    @Builder.Default
    private Double aiQualityScore = 0.0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
