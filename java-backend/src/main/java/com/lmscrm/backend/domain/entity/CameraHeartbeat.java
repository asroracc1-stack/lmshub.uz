package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "camera_heartbeats", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CameraHeartbeat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "camera_id", nullable = false)
    private UUID cameraId;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "battery_percent")
    private Integer batteryPercent;

    @Column(name = "signal_quality")
    private Integer signalQuality;

    @Column(name = "fps")
    private Integer fps;

    @Column(name = "resolution", length = 30)
    private String resolution;
}
