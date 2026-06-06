package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "questions", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passage_id")
    private Passage passage;

    @Column(name = "question_type")
    private String questionType; // MULTIPLE_CHOICE, FILL_IN_BLANKS, etc.

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 1;

    @Column(name = "position_order")
    private Integer positionOrder;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "image_position")
    private String imagePosition;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<QuestionOption> options;
}
