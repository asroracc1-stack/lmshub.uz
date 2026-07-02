package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_engine_sessions", schema = "public", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"lesson_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceEngineSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String state = "INITIALIZING";

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "first_snapshot_at")
    private LocalDateTime firstSnapshotAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "snapshot_interval_sec", nullable = false)
    @Builder.Default
    private Integer snapshotIntervalSec = 20;

    @Column(name = "min_presence_score", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal minPresenceScore = new BigDecimal("0.60");

    @Column(name = "late_threshold_min", nullable = false)
    @Builder.Default
    private Integer lateThresholdMin = 10;

    @Column(name = "left_early_threshold_min", nullable = false)
    @Builder.Default
    private Integer leftEarlyThresholdMin = 15;

    @Column(name = "decision_window_min", nullable = false)
    @Builder.Default
    private Integer decisionWindowMin = 5;

    @Column(name = "total_snapshots", nullable = false)
    @Builder.Default
    private Integer totalSnapshots = 0;

    @Column(name = "students_tracked", nullable = false)
    @Builder.Default
    private Integer studentsTracked = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
    }
}
