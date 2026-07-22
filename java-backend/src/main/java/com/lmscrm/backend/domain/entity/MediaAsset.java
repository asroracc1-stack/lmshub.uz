package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "media_assets", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "file_hash", nullable = false, unique = true)
    private String fileHash;

    @Column(nullable = false)
    private String filename;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(nullable = false, length = 512)
    private String url;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
