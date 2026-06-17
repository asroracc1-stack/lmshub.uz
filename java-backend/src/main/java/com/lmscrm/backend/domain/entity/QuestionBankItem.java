package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Question Bank — exam ga bog'lanmagan mustaqil savol banki.
 * Super Admin / Admin savollarni bu yerda saqlaydi va keyin exam ga import qilishi mumkin.
 */
@Entity
@Table(name = "question_bank_items", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionBankItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ─── Kategoriya va meta ───────────────────────────────────────────────
    @Column(nullable = false)
    private String subject;          // "Mathematics", "English", "Physics", etc.

    @Column(nullable = false)
    private String topic;            // "Algebra", "Reading Comprehension", etc.

    @Column(name = "exam_category", nullable = false)
    private String examCategory;     // "SAT", "IELTS", "MILLIY_SERTIFIKAT", "GENERAL"

    @Column(name = "question_type", nullable = false)
    private String questionType;     // "mcq", "multi_select", "true_false", "ynng", "matching",
                                     // "fill_blank", "short_answer", "essay", "reading", "listening", "image_based"

    @Column(nullable = false)
    private String difficulty;       // "easy", "medium", "hard"

    // ─── Content ─────────────────────────────────────────────────────────
    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;             // Savol matni (HTML/rich text yoki plain text)

    @Column(name = "rich_content", columnDefinition = "TEXT")
    private String richContent;      // JSON: [{type:"formula",content:"..."}, {type:"image",url:"..."}]

    @Column(name = "passage_text", columnDefinition = "TEXT")
    private String passageText;      // Reading savollari uchun matn

    @Column(name = "audio_url")
    private String audioUrl;         // Listening savollari uchun

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "image_position")
    private String imagePosition;    // "top", "bottom", "left", "right"

    // ─── Correct answer ───────────────────────────────────────────────────
    @Column(name = "correct_answer", columnDefinition = "TEXT")
    private String correctAnswer;    // String (fill_blank, short, essay uchun)

    @Column(columnDefinition = "TEXT")
    private String explanation;      // Tushuntirish (rich text)

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 1;

    // ─── Matching pairs (JSON: [{left:"...",right:"..."}]) ────────────────
    @Column(name = "matching_pairs", columnDefinition = "TEXT")
    private String matchingPairs;

    // ─── Tags ─────────────────────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String tags;             // Comma separated: "algebra,quadratic,2024"

    // ─── Usage stats ──────────────────────────────────────────────────────
    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // ─── Ownership ────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ─── Options (for MCQ, Multi-select, True/False, YNNG) ───────────────
    @OneToMany(mappedBy = "questionBankItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionOrder ASC")
    private List<QuestionBankOption> options;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (usageCount == null) usageCount = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
