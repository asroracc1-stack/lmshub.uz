package com.lmscrm.backend.controller.attendance;

import com.lmscrm.backend.domain.entity.CameraDevice;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.service.camera.CameraManagementService;
import com.lmscrm.backend.service.camera.CameraHeartbeatService;
import com.lmscrm.backend.repository.CameraDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cameras")
@RequiredArgsConstructor
public class CameraDeviceController {

    private final CameraManagementService cameraService;
    private final CameraHeartbeatService heartbeatService;
    private final CameraDeviceRepository cameraRepo;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<CameraDevice> registerCamera(@RequestBody CameraDevice camera) {
        return ResponseEntity.ok(cameraService.registerCamera(camera));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<List<CameraDevice>> getOrganizationCameras(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cameraRepo.findByOrganizationId(user.getOrganizationId()));
    }

    @PostMapping("/{id}/diagnose")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<CameraDevice> diagnoseCamera(@PathVariable UUID id) {
        return ResponseEntity.ok(cameraService.diagnoseCamera(id));
    }

    @PostMapping("/diagnose-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> diagnoseAllActive() {
        cameraService.diagnoseAllActiveCameras();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/heartbeat")
    public ResponseEntity<Void> sendHeartbeat(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "100") Integer batteryPercent,
            @RequestParam(required = false, defaultValue = "100") Integer signalQuality,
            @RequestParam(required = false, defaultValue = "30") Integer fps,
            @RequestParam(required = false, defaultValue = "1920x1080") String resolution,
            @RequestParam(required = false, defaultValue = "IP Camera") String deviceType) {
        heartbeatService.recordHeartbeat(id, batteryPercent, signalQuality, fps, resolution, deviceType);
        return ResponseEntity.ok().build();
    }
}
