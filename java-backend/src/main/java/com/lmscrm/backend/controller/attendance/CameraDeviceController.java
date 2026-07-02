package com.lmscrm.backend.controller.attendance;

import com.lmscrm.backend.domain.entity.CameraDevice;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.service.camera.CameraManagementService;
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
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class CameraDeviceController {

    private final CameraManagementService cameraService;
    private final CameraDeviceRepository cameraRepo;

    @PostMapping
    public ResponseEntity<CameraDevice> registerCamera(@RequestBody CameraDevice camera) {
        return ResponseEntity.ok(cameraService.registerCamera(camera));
    }

    @GetMapping
    public ResponseEntity<List<CameraDevice>> getOrganizationCameras(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cameraRepo.findByOrganizationId(user.getOrganizationId()));
    }

    @PostMapping("/{id}/diagnose")
    public ResponseEntity<CameraDevice> diagnoseCamera(@PathVariable UUID id) {
        return ResponseEntity.ok(cameraService.diagnoseCamera(id));
    }

    @PostMapping("/diagnose-all")
    public ResponseEntity<Void> diagnoseAllActive() {
        cameraService.diagnoseAllActiveCameras();
        return ResponseEntity.ok().build();
    }
}
