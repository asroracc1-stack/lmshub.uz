package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "student_attempts", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "max_score")
    private Integer maxScore;

    @Column(name = "is_passed")
    private Boolean isPassed;

    @Column(name = "overall_band")
    private Double overallBand;

    @Column(name = "ai_coach_feedback", columnDefinition = "TEXT")
    private String aiCoachFeedback;

    @Column(name = "predicted_score")
    private String predictedScore;

    @Column(name = "time_used_seconds")
    private Integer timeUsedSeconds;

    @Column(name = "auto_submitted")
    private Boolean autoSubmitted;

    @Column(name = "attempt_seed")
    private String attemptSeed;

    @Column(name = "reward_granted")
    @Builder.Default
    private Boolean rewardGranted = false;

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExamViolation> violations = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
    }
}
