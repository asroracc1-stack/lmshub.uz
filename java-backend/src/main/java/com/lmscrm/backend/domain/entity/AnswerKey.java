package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "answer_keys", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnswerKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    private Question question;

    @Column(name = "answer_type", nullable = false)
    private String answerType;

    @Column(name = "validator", nullable = false)
    private String validator;

    @Column(name = "correct_answer", nullable = false, columnDefinition = "TEXT")
    private String correctAnswer;

    @Column(name = "points", nullable = false)
    @Builder.Default
    private Integer points = 1;

    @Column(name = "partial_scoring", nullable = false)
    @Builder.Default
    private Boolean partialScoring = false;

    @Column(name = "negative_marking", nullable = false)
    @Builder.Default
    private Double negativeMarking = 0.0;

    @Column(name = "tolerance", nullable = false)
    @Builder.Default
    private Double tolerance = 0.0;

    @Column(name = "normalization_rules")
    private String normalizationRules;
}
