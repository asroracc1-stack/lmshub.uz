package com.lmscrm.backend.service.camera;

import com.lmscrm.backend.domain.entity.CameraDevice;
import com.lmscrm.backend.domain.enums.CameraStatus;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.CameraDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.InetAddress;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CameraManagementService {

    private final CameraDeviceRepository cameraRepo;

    /**
     * Run diagnostics ping check for a camera.
     * Updates status to ONLINE or OFFLINE based on ping reachability.
     */
    @Transactional
    public CameraDevice diagnoseCamera(UUID cameraId) {
        CameraDevice camera = cameraRepo.findById(cameraId)
                .orElseThrow(() -> new ResourceNotFoundException("Camera device not found"));

        if (camera.getIpAddress() == null || camera.getIpAddress().isBlank()) {
            camera.setStatus(CameraStatus.UNKNOWN);
            return cameraRepo.save(camera);
        }

        try {
            long startTime = System.currentTimeMillis();
            InetAddress address = InetAddress.getByName(camera.getIpAddress());
            boolean reachable = address.isReachable(3000); // 3 seconds timeout
            long endTime = System.currentTimeMillis();

            if (reachable) {
                camera.setStatus(CameraStatus.ONLINE);
                camera.setLastSeenAt(LocalDateTime.now());
                camera.setPingLatencyMs((int) (endTime - startTime));
                camera.setPacketLossPct(java.math.BigDecimal.ZERO);
            } else {
                camera.setStatus(CameraStatus.OFFLINE);
                camera.setPingLatencyMs(null);
                camera.setPacketLossPct(new java.math.BigDecimal("100.00"));
            }
        } catch (Exception e) {
            log.error("Diagnostics probe failed for camera IP: {}", camera.getIpAddress(), e);
            camera.setStatus(CameraStatus.OFFLINE);
            camera.setPingLatencyMs(null);
            camera.setPacketLossPct(new java.math.BigDecimal("100.00"));
        }

        camera.setUpdatedAt(LocalDateTime.now());
        return cameraRepo.save(camera);
    }

    /**
     * Diagnose all active cameras on a scheduled pipeline or manual trigger.
     */
    @Transactional
    public void diagnoseAllActiveCameras() {
        List<CameraDevice> activeCameras = cameraRepo.findByIsActiveTrue();
        for (CameraDevice camera : activeCameras) {
            try {
                diagnoseCamera(camera.getId());
            } catch (Exception e) {
                log.error("Failed to run scheduled diagnostics for camera ID: {}", camera.getId(), e);
            }
        }
    }

    /**
     * Registers a new camera device inside the database.
     */
    @Transactional
    public CameraDevice registerCamera(CameraDevice camera) {
        camera.setStatus(CameraStatus.UNKNOWN);
        camera.setCreatedAt(LocalDateTime.now());
        camera.setUpdatedAt(LocalDateTime.now());
        return cameraRepo.save(camera);
    }
}
