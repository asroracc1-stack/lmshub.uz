package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "exam_blueprints", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamBlueprint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false, unique = true)
    private Exam exam;

    @Column(name = "subject")
    private String subject;

    @Column(name = "easy_count")
    @Builder.Default
    private Integer easyCount = 0;

    @Column(name = "medium_count")
    @Builder.Default
    private Integer mediumCount = 0;

    @Column(name = "hard_count")
    @Builder.Default
    private Integer hardCount = 0;

    @Column(name = "rules_json", columnDefinition = "TEXT")
    private String rulesJson;
}
