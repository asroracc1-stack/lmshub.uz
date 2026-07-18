package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vocabulary_words", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VocabularyWord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String word;

    @Column(nullable = false)
    private String translation;

    @Column(name = "ipa_us", length = 100)
    private String ipaUs;

    @Column(name = "ipa_uk", length = 100)
    private String ipaUk;

    @Column(name = "part_of_speech", length = 50)
    private String partOfSpeech;

    @Column(columnDefinition = "TEXT")
    private String definition;

    @Column(name = "example_sentence", columnDefinition = "TEXT")
    private String exampleSentence;

    @Column(name = "uzbek_example", columnDefinition = "TEXT")
    private String uzbekExample;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Column(name = "audio_us_url", length = 512)
    private String audioUsUrl;

    @Column(name = "audio_uk_url", length = 512)
    private String audioUkUrl;

    @Column(nullable = false, length = 10)
    private String level;

    @Column(nullable = false)
    private Integer unit;

    @Column(length = 512)
    private String synonyms;

    @Column(length = 512)
    private String antonyms;

    @Column(name = "difficulty_score")
    @Builder.Default
    private Double difficultyScore = 1.0;

    @Column(columnDefinition = "TEXT")
    private String collocations;

    @Column(name = "common_mistakes", columnDefinition = "TEXT")
    private String commonMistakes;

    @Column(name = "pronunciation_tips", columnDefinition = "TEXT")
    private String pronunciationTips;

    @Column(length = 50)
    private String category;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (difficultyScore == null) {
            difficultyScore = 1.0;
        }
    }
}
