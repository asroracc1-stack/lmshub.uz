package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "speaking_scores", indexes = {
    @Index(name = "idx_speaking_score_session_id", columnList = "session_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeakingScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true)
    private UUID sessionId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", referencedColumnName = "id", insertable = false, updatable = false)
    private SpeakingSession session;

    @Column(nullable = false)
    private int pronunciation;

    @Column(nullable = false)
    private int fluency;

    @Column(nullable = false)
    private int grammar;

    @Column(nullable = false)
    private int vocabulary;

    @Column(nullable = false)
    private int confidence;

    @Column(nullable = false)
    private int overall;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
