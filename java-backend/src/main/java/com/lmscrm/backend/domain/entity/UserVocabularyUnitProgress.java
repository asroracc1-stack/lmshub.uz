package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_vocabulary_unit_progress", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVocabularyUnitProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 10)
    private String level;

    @Column(nullable = false)
    private Integer unit;

    @Column(name = "stage_completed", nullable = false)
    @Builder.Default
    private Integer stageCompleted = 0; // 0: None, 1: LEARN, 2: WRITE, 3: SPEAK

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (stageCompleted == null) {
            stageCompleted = 0;
        }
    }
}
