package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import java.util.List;

@Entity
@Table(name = "passages", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Passage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "position_order")
    private Integer positionOrder;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    // === Enterprise Builder fields ===

    @Column(name = "audio_url")
    private String audioUrl;            // Section intro audio

    @Column(name = "pdf_attachment")
    private String pdfAttachment;       // PDF reference

    @Column(name = "time_limit_seconds")
    private Integer timeLimitSeconds;   // Per-section time limit

    @Column(name = "shuffle_questions")
    @Builder.Default
    private Boolean shuffleQuestions = false;

    @Column(name = "shuffle_options")
    @Builder.Default
    private Boolean shuffleOptions = false;

    @Column(name = "auto_numbering")
    @Builder.Default
    private Boolean autoNumbering = true;

    @Column(name = "lock_navigation")
    @Builder.Default
    private Boolean lockNavigation = false;

    @Column(name = "question_randomization")
    @Builder.Default
    private Boolean questionRandomization = false;

    @Column(name = "icon")
    private String icon;

    @Column(name = "color_theme")
    private String colorTheme;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "passing_score")
    private Integer passingScore;

    @OneToMany(mappedBy = "passage", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions;
}
