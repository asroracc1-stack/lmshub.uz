package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "db_stored_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DbStoredFile {

    @Id
    @Column(name = "filename", length = 255)
    private String filename;

    @Column(name = "content_type", nullable = false, length = 255)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "storage_type", nullable = false, length = 50)
    private String storageType; // "DB" or "LOCAL"

    @Column(name = "path", length = 512)
    private String path; // physical path on disk if storageType is "LOCAL"

    @Column(name = "data", columnDefinition = "bytea")
    private byte[] data; // binary content if storageType is "DB", null otherwise

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
