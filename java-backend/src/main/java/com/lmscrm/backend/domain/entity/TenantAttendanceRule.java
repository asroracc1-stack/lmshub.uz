package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenant_attendance_rules", schema = "public", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"organization_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantAttendanceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "late_minutes_limit", nullable = false)
    @Builder.Default
    private Integer lateMinutesLimit = 10;

    @Column(name = "absent_minutes_limit", nullable = false)
    @Builder.Default
    private Integer absentMinutesLimit = 20;

    @Column(name = "min_score_present", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal minScorePresent = new BigDecimal("0.60");

    @Column(name = "early_leave_limit", nullable = false)
    @Builder.Default
    private Integer earlyLeaveLimit = 15;

    @Column(name = "allow_teacher_override", nullable = false)
    @Builder.Default
    private Boolean allowTeacherOverride = true;

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
