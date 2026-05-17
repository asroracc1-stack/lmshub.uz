package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.BotSetting;
import com.lmscrm.backend.repository.BotSettingRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bot-settings")
@RequiredArgsConstructor
@Tag(name = "Bot Settings Controller", description = "Endpoints for SuperAdmin to manage Telegram bot configuration")
public class BotSettingController {

    private final BotSettingRepository botSettingRepository;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get Bot Settings")
    public ResponseEntity<List<BotSetting>> getSettings() {
        return ResponseEntity.ok(botSettingRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Save or Update Bot Settings")
    public ResponseEntity<BotSetting> save(@RequestBody BotSetting setting) {
        // Simple logic: keep only one active setting or just save
        return ResponseEntity.ok(botSettingRepository.save(setting));
    }
}
