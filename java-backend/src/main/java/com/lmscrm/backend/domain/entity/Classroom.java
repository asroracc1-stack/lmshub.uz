package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "classrooms", schema = "public", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"campus_id", "code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campus_id", nullable = false)
    private Campus campus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 20)
    private String code;

    private Integer capacity;

    @Column(name = "has_camera", nullable = false)
    @Builder.Default
    private Boolean hasCamera = false;

    @Column(name = "camera_stream_url", columnDefinition = "TEXT")
    private String cameraStreamUrl;

    @Column(name = "camera_type", nullable = false, length = 50)
    @Builder.Default
    private String cameraType = "NONE";

    @Column(name = "camera_username", length = 100)
    private String cameraUsername;

    @Column(name = "camera_password_enc", columnDefinition = "TEXT")
    private String cameraPasswordEnc;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
