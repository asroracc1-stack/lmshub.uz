package com.lmscrm.backend.domain.entity;

import com.lmscrm.backend.domain.enums.ExamType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "exams", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "audio_url")
    private String audioUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExamType type;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "passing_score", nullable = false)
    private Integer passingScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = true)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false)
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "sub_type")
    private String subType;

    @Column(name = "is_ai_imported", nullable = false)
    @Builder.Default
    private Boolean isAiImported = false;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "required_pack", nullable = false)
    @Builder.Default
    private String requiredPack = "free";

    @Column(name = "pdf_url")
    private String pdfUrl;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Passage> passages;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
    }
}
