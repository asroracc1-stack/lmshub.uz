package com.lmscrm.backend.controller.auth;

import com.lmscrm.backend.dto.auth.GoogleLoginRequest;
import com.lmscrm.backend.dto.auth.LoginRequest;
import com.lmscrm.backend.dto.auth.LoginResponse;
import com.lmscrm.backend.dto.auth.RegisterRequest;
import com.lmscrm.backend.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication Controller", description = "Endpoints for user login and registration")
public class AuthController {

    private final AuthService authService;
    private final com.lmscrm.backend.service.auth.OtpService otpService;

    @PostMapping("/send-otp")
    @Operation(summary = "Send OTP to phone")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody com.lmscrm.backend.dto.auth.OtpRequest request) {
        otpService.generateAndSendOtp(request.getPhone());
        return ResponseEntity.ok(java.util.Map.of("message", "OTP sent successfully"));
    }

    @PostMapping("/login")
    @Operation(summary = "User Login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        System.out.println("Kelgan login: " + loginRequest.getUsernameOrEmail());
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/register")
    @Operation(summary = "User Registration")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        return ResponseEntity.ok(authService.register(registerRequest));
    }

    @PostMapping("/google")
    @Operation(summary = "Google Login/Registration")
    public ResponseEntity<LoginResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.googleLogin(request));
    }

    @GetMapping("/reset-superadmin-pwd")
    @Operation(summary = "Reset Super Admin Password")
    public ResponseEntity<String> resetSuperAdmin() {
        authService.resetSuperAdminPassword();
        return ResponseEntity.ok("Password reset to 11111111");
    }

    @GetMapping("/health")
    @Operation(summary = "Health Check for Railway")
    public ResponseEntity<java.util.Map<String, String>> healthCheck() {
        return ResponseEntity.ok(java.util.Map.of(
            "status", "UP",
            "service", "lmscrm-backend"
        ));
    }
}
