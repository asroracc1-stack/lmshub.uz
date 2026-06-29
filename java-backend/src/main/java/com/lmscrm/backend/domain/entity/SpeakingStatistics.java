package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "speaking_statistics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeakingStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "daily_speaking_time")
    @Builder.Default
    private int dailySpeakingTime = 0; // in minutes

    @Builder.Default
    private int streak = 0; // days

    @Column(name = "words_learned")
    @Builder.Default
    private int wordsLearned = 0;

    @Column(name = "sessions_completed")
    @Builder.Default
    private int sessionsCompleted = 0;

    @Column(name = "average_score")
    @Builder.Default
    private int averageScore = 0;
}
