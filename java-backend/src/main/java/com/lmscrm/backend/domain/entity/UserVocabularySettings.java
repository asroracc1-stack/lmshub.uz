package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_vocabulary_settings", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVocabularySettings {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "daily_goal", nullable = false)
    @Builder.Default
    private Integer dailyGoal = 20;

    @Column(name = "current_streak", nullable = false)
    @Builder.Default
    private Integer currentStreak = 0;

    @Column(name = "longest_streak", nullable = false)
    @Builder.Default
    private Integer longestStreak = 0;

    @Column(name = "last_activity_date")
    private LocalDate lastActivityDate;

    @Column(name = "total_minutes_studied", nullable = false)
    @Builder.Default
    private Double totalMinutesStudied = 0.0;

    @Column(name = "vocabulary_title", length = 50, nullable = false)
    @Builder.Default
    private String vocabularyTitle = "Novice";

    @Column(name = "claimed_chests", columnDefinition = "TEXT")
    @Builder.Default
    private String claimedChests = ""; // Comma-separated list of chest keys
}
