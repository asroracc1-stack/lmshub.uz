package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "speaking_sessions", indexes = {
    @Index(name = "idx_speaking_session_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeakingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String topic;

    @Column(name = "proficiency_level")
    private String level;

    private String language;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "message_count")
    @Builder.Default
    private int messageCount = 0;

    @Column(name = "word_count")
    @Builder.Default
    private int wordCount = 0;

    @Builder.Default
    private boolean active = true;
}
