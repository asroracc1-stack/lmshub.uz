package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "library_materials", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LibraryMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private LibraryCategory category;

    @Column(nullable = false)
    private String title;

    private String author;

    private String description;

    private String subject; // Fan

    private String grade; // Sinf (e.g. 1-sinf, 2-sinf, etc.)

    private String topic; // Mavzu

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(name = "pdf_url")
    private String pdfUrl;

    @Column(name = "access_type", nullable = false)
    @Builder.Default
    private String accessType = "FREE"; // FREE, PRO, ELITE

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, DRAFT, HIDDEN

    @Column(name = "views_count", nullable = false)
    @Builder.Default
    private Integer viewsCount = 0;

    @Column(name = "downloads_count", nullable = false)
    @Builder.Default
    private Integer downloadsCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (viewsCount == null) viewsCount = 0;
        if (downloadsCount == null) downloadsCount = 0;
        if (accessType == null) accessType = "FREE";
        if (status == null) status = "ACTIVE";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
