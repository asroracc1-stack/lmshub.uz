package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_vocabulary_achievements", schema = "public",
       uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "achievement_code"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVocabularyAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "achievement_code", nullable = false, length = 50)
    private String achievementCode;

    @Column(name = "unlocked_at", nullable = false)
    private LocalDateTime unlockedAt;

    @PrePersist
    protected void onCreate() {
        if (unlockedAt == null) {
            unlockedAt = LocalDateTime.now();
        }
    }
}
