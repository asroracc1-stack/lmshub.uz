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
    private String questionType; // single_choice, multiple_choice, fill_blank, essay, etc.

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 1;

    @Column(name = "negative_marks")
    @Builder.Default
    private Double negativeMarks = 0.0;

    @Column(name = "position_order")
    private Integer positionOrder;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "image_position")
    private String imagePosition;

    @Column(name = "audio_url")
    private String audioUrl;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "formula_latex", columnDefinition = "TEXT")
    private String formulaLatex;

    @Column(name = "matching_pairs", columnDefinition = "TEXT")
    private String matchingPairs;   // JSON string

    @Column(name = "fill_template", columnDefinition = "TEXT")
    private String fillTemplate;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(columnDefinition = "TEXT")
    private String hint;

    @Column(name = "topic")
    private String topic;

    @Column(name = "subtopic")
    private String subtopic;

    @Column(name = "tags")
    private String tags;            // comma-separated

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "status")
    @Builder.Default
    private String status = "draft";

    @Column(name = "time_limit_seconds")
    private Integer timeLimitSeconds;

    @Column(name = "numeric_answer")
    private Double numericAnswer;

    @Column(name = "numeric_tolerance")
    private Double numericTolerance;

    @Column(name = "word_limit")
    private Integer wordLimit;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "parent_id")
    private UUID parentId;



    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<QuestionOption> options;
}

