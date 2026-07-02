package com.lmscrm.backend.domain.entity;

import com.lmscrm.backend.domain.enums.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "student_presence_scores", schema = "public", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"session_id", "student_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentPresenceScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AttendanceEngineSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "snapshots_present", nullable = false)
    @Builder.Default
    private Integer snapshotsPresent = 0;

    @Column(name = "snapshots_total", nullable = false)
    @Builder.Default
    private Integer snapshotsTotal = 0;

    @Column(name = "presence_score", nullable = false, precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal presenceScore = BigDecimal.ZERO;

    @Column(name = "first_seen_at")
    private LocalDateTime firstSeenAt;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "first_seen_offset_min")
    private Integer firstSeenOffsetMin;

    @Column(name = "last_seen_offset_min")
    private Integer lastSeenOffsetMin;

    @Column(name = "avg_confidence", precision = 5, scale = 4)
    private BigDecimal avgConfidence;

    @Column(name = "min_confidence", precision = 5, scale = 4)
    private BigDecimal minConfidence;

    @Enumerated(EnumType.STRING)
    @Column(name = "final_status", length = 30)
    private AttendanceStatus finalStatus;

    @Column(name = "decision_method", length = 30)
    private String decisionMethod;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;
}
