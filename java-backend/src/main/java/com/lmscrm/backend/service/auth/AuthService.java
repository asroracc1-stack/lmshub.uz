package com.lmscrm.backend.service.auth;

import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.auth.LoginRequest;
import com.lmscrm.backend.dto.auth.LoginResponse;
import com.lmscrm.backend.dto.auth.RegisterRequest;
import com.lmscrm.backend.repository.ProfileRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientId;

    // ======================== SUPER ADMIN SABIT ID ============================
    // UUID o'zgarmaydi — superadmin username o'zgartirsa ham kira oladi
    private static final java.util.UUID SUPER_ADMIN_UUID =
            java.util.UUID.fromString("00000000-0000-0000-0000-000000000001");

    // ======================= LOGIN =======================
    @Transactional
    public LoginResponse login(LoginRequest loginRequest) {
        log.info("🔑 Login attempt: {}", loginRequest.getUsernameOrEmail());
        


        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsernameOrEmail(), loginRequest.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            User user = (User) authentication.getPrincipal();

            // ─── Superadmin himoyasi ─────────────────────────────────────────
            // Ikkala SuperAdmin hisobining ham rollarini qat'iy tekshiramiz va kafolatlaymiz
            if ("asrorsuperadmin".equalsIgnoreCase(user.getUsername()) 
                    || "asrorsuper".equalsIgnoreCase(user.getUsername()) 
                    || "asror".equalsIgnoreCase(user.getUsername()) 
                    || user.getRole() == AppRole.SUPER_ADMIN) {
                // Roli SUPER_ADMIN ekanligini kafolatlaymiz
                if (user.getRole() != AppRole.SUPER_ADMIN) {
                    user.setRole(AppRole.SUPER_ADMIN);
                    userRepository.save(user);
                    log.info("🛡️ SuperAdmin roli SUPER_ADMIN ga muvaffaqiyatli tiklandi.");
                }
            }
            // ─────────────────────────────────────────────────────────────────

            String jwt = tokenProvider.generateToken(authentication);
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
            Profile profile = getOrCreateProfile(user);
            return buildLoginResponse(jwt, user, profile);
        } catch (BadCredentialsException e) {
            throw e;
        } catch (Exception e) {
            log.error("❌ Login failed for {}: {}", loginRequest.getUsernameOrEmail(), e.getMessage(), e);
            throw new BadCredentialsException("Username yoki parol xato");
        }
    }

    // ======================= GOOGLE LOGIN (STABLE VERSION) =======================
    @Transactional
    public LoginResponse googleLogin(com.lmscrm.backend.dto.auth.GoogleLoginRequest request) {
        log.info("🌐 [Google Auth] Final attempt starting...");
        try {
            String token = request.getToken();
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            java.util.Map<String, Object> payload = null;

            // Step 1: Token Verification
            try {
                payload = restTemplate.getForObject("https://oauth2.googleapis.com/tokeninfo?id_token=" + token, java.util.Map.class);
            } catch (Exception e) {
                try {
                    payload = restTemplate.getForObject("https://oauth2.googleapis.com/tokeninfo?access_token=" + token, java.util.Map.class);
                } catch (Exception e2) {
                    throw new BadCredentialsException("Google token yaroqsiz");
                }
            }

            if (payload == null || payload.containsKey("error")) {
                throw new BadCredentialsException("Google serveridan xato qaytdi");
            }

            String email = (String) payload.get("email");
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");

            // Extra info
            if (name == null || picture == null) {
                try {
                    java.util.Map<String, Object> userInfo = restTemplate.getForObject("https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + token, java.util.Map.class);
                    if (userInfo != null) {
                        if (name == null) name = (String) userInfo.get("name");
                        if (picture == null) picture = (String) userInfo.get("picture");
                    }
                } catch (Exception ignore) {}
            }

            final String finalEmail = email;
            final String finalName = name != null ? name : email.split("@")[0];
            final String finalPicture = picture;

            // Step 2: User Creation
            User user = userRepository.findByEmail(finalEmail).orElseGet(() -> {
                String baseUname = finalEmail.split("@")[0];
                String finalUname = baseUname;
                int count = 1;
                while (userRepository.findByUsername(finalUname).isPresent()) {
                    finalUname = baseUname + "_" + (count++);
                }
                return User.builder()
                        .email(finalEmail)
                        .username(finalUname)
                        .password(passwordEncoder.encode("GAuth_" + UUID.randomUUID()))
                        .role(AppRole.USER)
                        .active(true)
                        .isGoogleUser(true)
                        .avatarUrl(finalPicture)
                        .fullName(finalName)
                        .createdAt(LocalDateTime.now())
                        .coins(0L)
                        .build();
            });

            user.setLastLoginAt(LocalDateTime.now());
            user.setIsGoogleUser(true);
            if (finalPicture != null) user.setAvatarUrl(finalPicture);
            // Save User first
            final User finalSavedUser = userRepository.save(user);

            // Step 3: Profile Creation (Stable Mapping)
            Profile profile = profileRepository.findByUser(finalSavedUser).orElseGet(() -> {
                log.info("📄 [Google Auth] Creating new profile record...");
                String[] nameParts = finalName.split("\\s+", 2);
                return Profile.builder()
                        .user(finalSavedUser)
                        .firstName(nameParts[0])
                        .lastName(nameParts.length > 1 ? nameParts[1] : "")
                        .avatarUrl(finalPicture)
                        .isActive(true)
                        .build();
            });
            
            // Save Profile separately then link
            profile = profileRepository.save(profile);
            finalSavedUser.setProfile(profile);
            User fullySavedUser = userRepository.save(finalSavedUser);

            // Step 4: Security Context
            Authentication auth = new UsernamePasswordAuthenticationToken(fullySavedUser, null, fullySavedUser.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
            String jwt = tokenProvider.generateToken(auth);

            log.info("✅ [Google Auth] Login SUCCESS for {}", finalEmail);
            return buildLoginResponse(jwt, fullySavedUser, profile);

        } catch (Throwable t) {
            log.error("💥 [Google Auth] CRITICAL ERROR: ", t);
            throw new RuntimeException("Google Login xatosi: " + t.getMessage());
        }
    }

    // ======================= REGISTER =======================
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Parollar mos kelmadi");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseGet(() -> userRepository.findByUsername(request.getUsername())
                .orElse(null));

        if (user == null) {
            user = User.builder()
                    .email(request.getEmail())
                    .username(request.getUsername() != null ? request.getUsername().toLowerCase().trim() : null)
                    .password(passwordEncoder.encode(request.getPassword()))
                    .fullName(request.getFullName())
                    .phoneNumber(request.getPhone())
                    .role(AppRole.USER)
                    .active(true)
                    .createdAt(LocalDateTime.now())
                    .build();
            user = userRepository.save(user);
            
            String[] parts = request.getFullName().split("\\s+", 2);
            Profile profile = Profile.builder()
                    .user(user)
                    .firstName(parts[0])
                    .lastName(parts.length > 1 ? parts[1] : "")
                    .isActive(true)
                    .build();
            profile = profileRepository.save(profile);
            user.setProfile(profile);
            userRepository.save(user);
        }

        Authentication auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        String jwt = tokenProvider.generateToken(auth);
        
        return buildLoginResponse(jwt, user, getOrCreateProfile(user));
    }

    private Profile getOrCreateProfile(User user) {
        if (user.getProfile() != null) return user.getProfile();
        return profileRepository.findByUser(user).orElseGet(() -> {
            String[] parts = (user.getFullName() != null ? user.getFullName() : user.getUsername()).split("\\s+", 2);
            Profile p = Profile.builder()
                    .user(user)
                    .firstName(parts[0])
                    .lastName(parts.length > 1 ? parts[1] : "")
                    .isActive(true)
                    .build();
            return profileRepository.save(p);
        });
    }

    private LoginResponse buildLoginResponse(String jwt, User user, Profile profile) {
        return LoginResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .role(user.getRole().name())
                .organizationId(user.getOrganizationId())
                .user(LoginResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .firstName(profile != null ? profile.getFirstName() : user.getUsername())
                        .lastName(profile != null ? profile.getLastName() : "")
                        .organizationId(user.getOrganizationId())
                        .build())
                .build();
    }

    public void resetSuperAdminPassword() {
        userRepository.findById(SUPER_ADMIN_UUID).ifPresent(user -> {
            user.setPassword(passwordEncoder.encode("11111111"));
            userRepository.save(user);
            log.info("🔐 SuperAdmin paroli tiklandi (UUID: {})", SUPER_ADMIN_UUID);
        });
    }

    // ======================= SUPERADMIN O'Z PROFILINI YANGILASH =======================
    @Transactional
    public LoginResponse updateSuperAdminProfile(String newUsername, String newPassword, User currentUser) {
        // Faqat superadmin o'z profilini yangilay oladi — UUID bilan tekshiramiz
        if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
            throw new RuntimeException("Ruxsat etilmagan!");
        }
        if (!SUPER_ADMIN_UUID.equals(currentUser.getId())) {
            throw new RuntimeException("Faqat asosiy superadmin o'z profilini yangilay oladi!");
        }

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Foydalanuvchi topilmadi"));

        // Username yangilash
        if (newUsername != null && !newUsername.trim().isEmpty()) {
            String trimmed = newUsername.trim().toLowerCase();
            Optional<User> existing = userRepository.findByUsername(trimmed);
            if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                throw new RuntimeException("Bu username allaqachon band!");
            }
            user.setUsername(trimmed);
            log.info("✏️ SuperAdmin username yangilandi: {} -> {}", currentUser.getUsername(), trimmed);
        }

        // Parol yangilash
        if (newPassword != null && !newPassword.trim().isEmpty()) {
            if (newPassword.trim().length() < 6) {
                throw new RuntimeException("Parol kamida 6 ta belgidan iborat bo'lishi kerak!");
            }
            user.setPassword(passwordEncoder.encode(newPassword.trim()));
            log.info("🔐 SuperAdmin paroli yangilandi");
        }

        User saved = userRepository.save(user);
        Profile profile = getOrCreateProfile(saved);

        // Yangi token yaratamiz
        Authentication auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                saved, null, saved.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        String jwt = tokenProvider.generateToken(auth);

        return buildLoginResponse(jwt, saved, profile);
    }
}
