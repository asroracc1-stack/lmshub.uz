package com.lmscrm.backend.config;

import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.repository.ProfileRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  TIZIM XAVFSIZLIGI: YAGONA SUPER ADMIN KAFOLATI          ║
 * ║  Har startup da:                                          ║
 * ║    1. Eski/noto'g'ri SUPER_ADMIN larni o'chiradi          ║
 * ║    2. Faqat bitta 'asrorsuperadmin' ni kafolatlaydi       ║
 * ║    3. Parol har doim BCrypt bilan saqlanadi               ║
 * ╚══════════════════════════════════════════════════════════╝
 */
// Disabled to avoid conflict with SuperAdminInitializer
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final UUID SUPER_ADMIN_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final String SUPER_ADMIN_USERNAME = "asrorsuper";
    private static final String SUPER_ADMIN_DEFAULT_PASSWORD = "asror2026";

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("🔐 [DataInitializer] SuperAdmin xavfsizlik tekshiruvi boshlanmoqda...");
        ensureSingleSuperAdmin();
        log.info("✅ [DataInitializer] SuperAdmin tekshiruvi tugadi.");
    }

    private void ensureSingleSuperAdmin() {
        log.info("🧹 Bazadan eski 'asrorsuperadmin' va 'asrorsuper' foydalanuvchilarini qidirish va butunlay tozalash...");

        // 1. Username 'asrorsuperadmin' bo'lgan eski foydalanuvchini topib o'chirish
        userRepository.findByUsername("asrorsuperadmin").ifPresent(user -> {
            log.warn("🚨 Noto'g'ri/eski 'asrorsuperadmin' topildi. O'chirilmoqda...");
            profileRepository.findByUser(user).ifPresent(profileRepository::delete);
            userRepository.delete(user);
            log.info("👤 Eski 'asrorsuperadmin' foydalanuvchisi o'chirildi.");
        });

        // 2. Username 'asrorsuper' bo'lgan foydalanuvchini ham o'chirish (toza noldan yaratish uchun)
        userRepository.findByUsername(SUPER_ADMIN_USERNAME).ifPresent(user -> {
            log.warn("🚨 Eski 'asrorsuper' topildi. O'chirilmoqda...");
            profileRepository.findByUser(user).ifPresent(profileRepository::delete);
            userRepository.delete(user);
            log.info("👤 Eski 'asrorsuper' foydalanuvchisi o'chirildi.");
        });

        // 3. ID '00000000-0000-0000-0000-000000000001' bo'lgan canonical superadminni ham tekshirib o'chiramiz
        userRepository.findById(SUPER_ADMIN_ID).ifPresent(user -> {
            log.warn("🚨 Canonical ID bo'lgan foydalanuvchi topildi. O'chirilmoqda...");
            profileRepository.findByUser(user).ifPresent(profileRepository::delete);
            userRepository.delete(user);
            log.info("👤 Canonical foydalanuvchi o'chirildi.");
        });

        // 4. Boshqa barcha SUPER_ADMIN rolidagi foydalanuvchilarni ham ADMIN roliga o'tkazamiz
        List<User> allSuperAdmins = userRepository.findByRole(AppRole.SUPER_ADMIN);
        for (User u : allSuperAdmins) {
            u.setRole(AppRole.ADMIN);
            userRepository.save(u);
            log.info("⬇️ Duplikat SuperAdmin ADMIN roliga tushirildi: username='{}'", u.getUsername());
        }

        // 5. Mutloq noldan toza yangi yagona Super Admin yaratish
        createCanonicalSuperAdmin();
    }

    private void createCanonicalSuperAdmin() {
        String hashedPassword = passwordEncoder.encode(SUPER_ADMIN_DEFAULT_PASSWORD);

        User superAdmin = User.builder()
                .id(SUPER_ADMIN_ID)
                .username(SUPER_ADMIN_USERNAME)
                .email("asrorsuperadmin@lmshub.uz")
                .password(hashedPassword)
                .fullName("Asror Super Admin")
                .role(AppRole.SUPER_ADMIN)
                .active(true)
                .isGoogleUser(false)
                .coins(0L)
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(superAdmin);
        log.info("✅ SuperAdmin yaratildi: username='{}' (BCrypt hash saqlandi)", SUPER_ADMIN_USERNAME);

        Profile profile = Profile.builder()
                .user(superAdmin)
                .firstName("Asror")
                .lastName("SuperAdmin")
                .isActive(true)
                .build();
        profileRepository.save(profile);
        log.info("📄 SuperAdmin profili yaratildi.");
    }
}
