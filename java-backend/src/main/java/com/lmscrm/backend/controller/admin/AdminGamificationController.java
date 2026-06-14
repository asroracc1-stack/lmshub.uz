package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.GamificationCheckpoint;
import com.lmscrm.backend.domain.entity.GamificationSettings;
import com.lmscrm.backend.service.GamificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/gamification")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public class AdminGamificationController {

    private final GamificationService gamificationService;

    @GetMapping("/settings")
    public ResponseEntity<GamificationSettings> getSettings() {
        return ResponseEntity.ok(gamificationService.getSettings());
    }

    @PostMapping("/settings")
    public ResponseEntity<GamificationSettings> updateSettings(@RequestBody GamificationSettings settings) {
        return ResponseEntity.ok(gamificationService.updateSettings(settings));
    }

    @GetMapping("/checkpoints")
    public ResponseEntity<List<GamificationCheckpoint>> getCheckpoints() {
        return ResponseEntity.ok(gamificationService.getAllCheckpoints());
    }

    @PostMapping("/checkpoints")
    public ResponseEntity<GamificationCheckpoint> createCheckpoint(@RequestBody GamificationCheckpoint checkpoint) {
        return ResponseEntity.ok(gamificationService.saveCheckpoint(checkpoint));
    }

    @PutMapping("/checkpoints/{id}")
    public ResponseEntity<GamificationCheckpoint> updateCheckpoint(
            @PathVariable UUID id,
            @RequestBody GamificationCheckpoint checkpoint) {
        checkpoint.setId(id);
        return ResponseEntity.ok(gamificationService.saveCheckpoint(checkpoint));
    }

    @DeleteMapping("/checkpoints/{id}")
    public ResponseEntity<Void> deleteCheckpoint(@PathVariable UUID id) {
        gamificationService.deleteCheckpoint(id);
        return ResponseEntity.noContent().build();
    }
}
