package com.lmscrm.backend.controller.common;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.user.PasswordChangeRequest;
import com.lmscrm.backend.dto.user.ProfileUpdateRequest;
import com.lmscrm.backend.dto.user.UsernameUpdateRequest;
import com.lmscrm.backend.service.common.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @PutMapping("/update")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody ProfileUpdateRequest request) {
        profileService.updateProfile(user, request);
        return ResponseEntity.ok(Map.of("message", "Profil muvaffaqiyatli yangilandi"));
    }

    @PatchMapping("/username")
    public ResponseEntity<?> updateUsername(
            @AuthenticationPrincipal User user,
            @RequestBody UsernameUpdateRequest request) {
        String newToken = profileService.updateUsername(user, request);
        return ResponseEntity.ok(Map.of(
            "message", "Username muvaffaqiyatli o'zgartirildi",
            "token", newToken
        ));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal User user,
            @RequestBody @jakarta.validation.Valid PasswordChangeRequest request) {
        profileService.changePassword(user, request);
        return ResponseEntity.ok(Map.of("message", "Parol muvaffaqiyatli o'zgartirildi"));
    }
}
