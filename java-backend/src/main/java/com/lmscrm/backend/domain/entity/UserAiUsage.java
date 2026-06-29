package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_ai_usages", schema = "public", indexes = {
    @Index(name = "idx_user_ai_usage_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAiUsage {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "speaking_minutes_used")
    @Builder.Default
    private int speakingMinutesUsed = 0;

    @Column(name = "messages_used")
    @Builder.Default
    private int messagesUsed = 0;

    @Column(name = "requests_today")
    @Builder.Default
    private int requestsToday = 0;

    @Column(name = "sessions_used")
    @Builder.Default
    private int sessionsUsed = 0;

    @Column(name = "tokens_used")
    @Builder.Default
    private int tokensUsed = 0;

    @Column(name = "voice_minutes_used")
    @Builder.Default
    private int voiceMinutesUsed = 0;

    @Column(name = "feedback_used")
    @Builder.Default
    private int feedbackUsed = 0;

    @Column(name = "quiz_generations")
    @Builder.Default
    private int quizGenerations = 0;

    @Column(name = "exam_generations")
    @Builder.Default
    private int examGenerations = 0;

    @Column(name = "homework_analysis")
    @Builder.Default
    private int homeworkAnalysis = 0;

    @Column(name = "course_generation")
    @Builder.Default
    private int courseGeneration = 0;

    @Column(name = "last_reset_date")
    private LocalDateTime lastResetDate;

    @Version
    private Long version; // Optimistic locking
}
