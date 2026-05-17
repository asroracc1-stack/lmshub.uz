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

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        String targetUsername = "asrorsuperadmin";
        String rawPassword = "ilhomhamdamarguba"; // Fixed missing 'a'

        log.info("🛠 Starting SuperAdmin check: {}", targetUsername);

        // 1. Agar foydalanuvchi allaqachon mavjud bo'lsa, parolini yangilaymiz
        userRepository.findByUsername(targetUsername).ifPresentOrElse(user -> {
            log.info("SuperAdmin exists. Updating password.");
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setEmail(targetUsername + "@example.com"); // Email uchun unikallik talabi bajarilishi mumkin
            userRepository.save(user);
        }, () -> {
            // 2. Yangi User yaratish
            log.info("SuperAdmin not found. Creating new one.");
            User superAdmin = User.builder()
                    .username(targetUsername)
                    .email(targetUsername + "@example.com")
                    .password(passwordEncoder.encode(rawPassword))
                    .fullName("Asror SuperAdmin")
                    .role(AppRole.SUPER_ADMIN)
                    .active(true)
                    .build();

            User savedUser = userRepository.save(superAdmin);

            // 3. Profil yaratish
            Profile profile = Profile.builder()
                    .user(savedUser)
                    .firstName("Asror")
                    .lastName("SuperAdmin")
                    .isActive(true)
                    .build();

            profileRepository.save(profile);
            log.info("✅ SUCCESS: SuperAdmin initialized with BCrypt.");
        });

        log.info("Credentials: {} / {}", targetUsername, rawPassword);
    }
}
