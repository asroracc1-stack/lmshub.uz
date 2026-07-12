package com.lmscrm.backend.service.camera;

import com.lmscrm.backend.domain.entity.CameraDevice;
import com.lmscrm.backend.domain.entity.CameraHeartbeat;
import com.lmscrm.backend.domain.entity.SecurityAlert;
import com.lmscrm.backend.domain.enums.CameraStatus;
import com.lmscrm.backend.repository.CameraDeviceRepository;
import com.lmscrm.backend.repository.CameraHeartbeatRepository;
import com.lmscrm.backend.repository.SecurityAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
@EnableScheduling
public class CameraHeartbeatService {

    private final CameraDeviceRepository cameraDeviceRepo;
    private final CameraHeartbeatRepository heartbeatRepo;
    private final SecurityAlertRepository securityAlertRepo;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    private final Map<String, LocalDateTime> localHeartbeatCache = new ConcurrentHashMap<>();

    private static final String REDIS_KEY_PREFIX = "camera:heartbeat:";

    @Transactional
    public void recordHeartbeat(UUID cameraId, Integer batteryPercent, Integer signalQuality, Integer fps, String resolution, String deviceType) {
        CameraDevice camera = cameraDeviceRepo.findById(cameraId).orElse(null);
        if (camera == null) {
            log.warn("Heartbeat received for non-existent camera ID: {}", cameraId);
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Update cache
        String cacheKey = REDIS_KEY_PREFIX + cameraId;
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(cacheKey, now.toString(), Duration.ofSeconds(15));
            } catch (Exception e) {
                log.error("Failed to write heartbeat to Redis, using local fallback", e);
                localHeartbeatCache.put(cacheKey, now);
            }
        } else {
            localHeartbeatCache.put(cacheKey, now);
        }

        // 2. Update status in Postgres
        camera.setStatus(CameraStatus.ONLINE);
        camera.setLastSeenAt(now);
        camera.setBatteryPercent(batteryPercent);
        camera.setSignalQuality(signalQuality);
        camera.setMaxFps(fps);
        camera.setResolutionWidth(parseResolutionWidth(resolution));
        camera.setResolutionHeight(parseResolutionHeight(resolution));
        camera.setDeviceType(deviceType);
        camera.setUpdatedAt(now);
        cameraDeviceRepo.save(camera);

        // 3. Log historical heartbeat
        CameraHeartbeat hb = CameraHeartbeat.builder()
                .cameraId(cameraId)
                .timestamp(now)
                .status("ONLINE")
                .batteryPercent(batteryPercent)
                .signalQuality(signalQuality)
                .fps(fps)
                .resolution(resolution)
                .build();
        heartbeatRepo.save(hb);

        // 4. Broadcast updated camera device status via WebSocket
        broadcastCameraStatus(camera);
    }

    @Scheduled(fixedRate = 5000)
    @Transactional
    public void checkOfflineCameras() {
        LocalDateTime now = LocalDateTime.now();
        List<CameraDevice> activeOnlineCameras = cameraDeviceRepo.findByIsActiveTrue();

        for (CameraDevice camera : activeOnlineCameras) {
            if (camera.getStatus() == CameraStatus.OFFLINE) {
                continue;
            }

            LocalDateTime lastSeen = camera.getLastSeenAt();
            boolean isOffline = false;

            if (lastSeen == null) {
                isOffline = true;
            } else {
                long secondsSinceLastSeen = Duration.between(lastSeen, now).toSeconds();
                if (secondsSinceLastSeen > 15) {
                    isOffline = true;
                }
            }

            if (isOffline) {
                log.warn("Camera {} (ID: {}) has missed heartbeats. Setting to OFFLINE.", camera.getName(), camera.getId());
                camera.setStatus(CameraStatus.OFFLINE);
                camera.setUpdatedAt(now);
                cameraDeviceRepo.save(camera);

                CameraHeartbeat hb = CameraHeartbeat.builder()
                        .cameraId(camera.getId())
                        .timestamp(now)
                        .status("OFFLINE")
                        .build();
                heartbeatRepo.save(hb);

                SecurityAlert alert = SecurityAlert.builder()
                        .timestamp(now)
                        .cameraId(camera.getId())
                        .type("CAMERA_DISCONNECTED")
                        .severity("WARNING")
                        .message("Camera '" + camera.getName() + "' disconnected. Last heartbeat was " + (lastSeen != null ? Duration.between(lastSeen, now).toSeconds() + "s ago" : "never"))
                        .resolved(false)
                        .build();
                securityAlertRepo.save(alert);

                broadcastCameraStatus(camera);
                broadcastSecurityAlert(alert);
            }
        }
    }

    private void broadcastCameraStatus(CameraDevice camera) {
        try {
            messagingTemplate.convertAndSend("/topic/cameras", camera);
        } catch (Exception e) {
            log.error("Failed to broadcast camera status update over WebSocket", e);
        }
    }

    private void broadcastSecurityAlert(SecurityAlert alert) {
        try {
            messagingTemplate.convertAndSend("/topic/security-alerts", alert);
        } catch (Exception e) {
            log.error("Failed to broadcast security alert over WebSocket", e);
        }
    }

    private Integer parseResolutionWidth(String resolution) {
        if (resolution == null || !resolution.contains("x")) return 1920;
        try {
            return Integer.parseInt(resolution.split("x")[0].trim());
        } catch (Exception e) {
            return 1920;
        }
    }

    private Integer parseResolutionHeight(String resolution) {
        if (resolution == null || !resolution.contains("x")) return 1080;
        try {
            return Integer.parseInt(resolution.split("x")[1].trim());
        } catch (Exception e) {
            return 1080;
        }
    }
}
