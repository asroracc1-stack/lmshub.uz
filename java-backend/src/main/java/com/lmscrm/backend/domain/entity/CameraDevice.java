package com.lmscrm.backend.domain.entity;

import com.lmscrm.backend.domain.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "camera_devices", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CameraDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campus_id", nullable = false)
    private Campus campus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String model;

    @Column(length = 100)
    private String manufacturer;

    @Column(name = "serial_number", length = 100, unique = true)
    private String serialNumber;

    @Column(name = "mac_address", length = 30)
    private String macAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private CameraProtocol protocol = CameraProtocol.RTSP;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Builder.Default
    private Integer port = 554;

    @Column(name = "stream_path", columnDefinition = "TEXT")
    private String streamPath;

    @Column(name = "stream_url_enc", nullable = false, columnDefinition = "TEXT")
    private String streamUrlEnc;

    @Column(name = "username_enc", columnDefinition = "TEXT")
    private String usernameEnc;

    @Column(name = "password_enc", columnDefinition = "TEXT")
    private String passwordEnc;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    @Builder.Default
    private CameraPosition position = CameraPosition.FRONT;

    @Column(name = "resolution_width")
    @Builder.Default
    private Integer resolutionWidth = 1920;

    @Column(name = "resolution_height")
    @Builder.Default
    private Integer resolutionHeight = 1080;

    @Column(name = "max_fps")
    @Builder.Default
    private Integer maxFps = 30;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private CameraStatus status = CameraStatus.UNKNOWN;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "last_fps", precision = 5, scale = 2)
    private BigDecimal lastFps;

    @Column(name = "last_bitrate_kbps")
    private Integer lastBitrateKbps;

    @Column(name = "last_latency_ms")
    private Integer lastLatencyMs;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "record_enabled", nullable = false)
    @Builder.Default
    private Boolean recordEnabled = false;

    @Column(name = "motion_detection", nullable = false)
    @Builder.Default
    private Boolean motionDetection = false;

    @Column(name = "frame_interval_sec", nullable = false)
    @Builder.Default
    private Integer frameIntervalSec = 20;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "recording_policy", length = 30)
    @Builder.Default
    private CameraRecordingPolicy recordingPolicy = CameraRecordingPolicy.ON_SCHEDULE;

    @Enumerated(EnumType.STRING)
    @Column(name = "snapshot_policy", length = 30)
    @Builder.Default
    private CameraSnapshotPolicy snapshotPolicy = CameraSnapshotPolicy.DURING_LESSON;

    @Column(name = "firmware_version", length = 100)
    private String firmwareVersion;

    @Column(name = "onvif_profile", length = 50)
    private String onvifProfile;

    @Column(name = "ping_latency_ms")
    private Integer pingLatencyMs;

    @Column(name = "packet_loss_pct", precision = 5, scale = 2)
    private BigDecimal packetLossPct;

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
