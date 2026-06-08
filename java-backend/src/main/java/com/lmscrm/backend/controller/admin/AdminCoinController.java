package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.finance.CoinGrantRequest;
import com.lmscrm.backend.service.finance.CoinService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/coins")
@RequiredArgsConstructor
@Tag(name = "Admin Coin Controller", description = "Endpoints for granting coins to users")
public class AdminCoinController {

    private final CoinService coinService;

    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Grant coins to a user")
    public ResponseEntity<Map<String, Object>> grantCoins(
            @Valid @RequestBody CoinGrantRequest request,
            @AuthenticationPrincipal User currentUser) {
        coinService.grantCoins(request.getStudentId(), request.getAmount(), request.getReason(), request.getComment(), currentUser);
        return ResponseEntity.ok(Map.of("success", true, "message", "Coinlar muvaffaqiyatli yuborildi"));
    }
}
