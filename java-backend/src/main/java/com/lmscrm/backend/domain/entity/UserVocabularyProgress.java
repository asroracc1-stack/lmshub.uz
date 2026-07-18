package com.lmscrm.backend.domain.entity;

import com.lmscrm.backend.domain.enums.WordStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_vocabulary_progress", schema = "public",
       uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "word_id"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVocabularyProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private VocabularyWord word;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private WordStatus status = WordStatus.NEW;

    @Column(name = "times_reviewed", nullable = false)
    @Builder.Default
    private Integer timesReviewed = 0;

    @Column(name = "times_correct_writing", nullable = false)
    @Builder.Default
    private Integer timesCorrectWriting = 0;

    @Column(name = "times_total_writing", nullable = false)
    @Builder.Default
    private Integer timesTotalWriting = 0;

    @Column(name = "speaking_accuracy_avg", nullable = false)
    @Builder.Default
    private Double speakingAccuracyAvg = 0.0;

    @Column(length = 10, nullable = false)
    @Builder.Default
    private String difficulty = "MEDIUM";

    @Column(name = "ease_factor", nullable = false)
    @Builder.Default
    private Double easeFactor = 2.5;

    @Column(name = "interval_days", nullable = false)
    @Builder.Default
    private Integer intervalDays = 1;

    @Column(name = "next_review_at")
    private LocalDateTime nextReviewAt;

    @Column(name = "last_reviewed_at")
    private LocalDateTime lastReviewedAt;

    @Column(name = "is_bookmarked", nullable = false)
    @Builder.Default
    private Boolean isBookmarked = false;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private Boolean isFavorite = false;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = WordStatus.NEW;
        if (timesReviewed == null) timesReviewed = 0;
        if (timesCorrectWriting == null) timesCorrectWriting = 0;
        if (timesTotalWriting == null) timesTotalWriting = 0;
        if (speakingAccuracyAvg == null) speakingAccuracyAvg = 0.0;
        if (difficulty == null) difficulty = "MEDIUM";
        if (easeFactor == null) easeFactor = 2.5;
        if (intervalDays == null) intervalDays = 1;
        if (isBookmarked == null) isBookmarked = false;
        if (isFavorite == null) isFavorite = false;
    }
}
