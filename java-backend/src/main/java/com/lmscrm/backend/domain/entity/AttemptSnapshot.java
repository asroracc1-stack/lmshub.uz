package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Enterprise Runtime Snapshot.
 * Locks the exam version and state when a student begins an attempt.
 */
@Entity
@Table(name = "attempt_snapshots", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttemptSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_attempt_id", nullable = false, updatable = false)
    private StudentAttempt studentAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false, updatable = false)
    private Exam exam;

    @Column(name = "locked_exam_version", nullable = false, updatable = false)
    private Integer lockedExamVersion;

    @Column(name = "snapshot_payload", columnDefinition = "TEXT", updatable = false)
    private String snapshotPayload; // JSON string containing exactly which Question IDs and AnswerKey IDs are frozen for this attempt

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
