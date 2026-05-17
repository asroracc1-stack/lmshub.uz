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
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SuperAdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("🛡️ [SuperAdminInitializer] Mutloq va Haqiqiy SuperAdmin Loader: Xavfsiz rejimda ishga tushmoqda...");

        // 1. Safe check for 1-SuperAdmin ('asrorsuperadmin')
        Optional<User> adminOpt1 = userRepository.findByUsername("asrorsuperadmin");
        User admin1;
        if (adminOpt1.isPresent()) {
            admin1 = adminOpt1.get();
            log.info("👤 Tizimda mavjud 'asrorsuperadmin' topildi (ID: {}). Ma'lumotlarni yangilaymiz...", admin1.getId());
            admin1.setPassword(passwordEncoder.encode("ilhomhamdamarguba"));
            admin1.setRole(AppRole.SUPER_ADMIN);
            admin1.setActive(true);
            userRepository.save(admin1);
        } else {
            log.info("🌱 'asrorsuperadmin' topilmadi. Yangidan yaratilmoqda...");
            UUID idToUse = UUID.fromString("00000000-0000-0000-0000-000000000001");
            if (userRepository.findById(idToUse).isPresent()) {
                idToUse = UUID.randomUUID(); // Fallback if canonical ID is somehow taken
            }
            admin1 = User.builder()
                    .id(idToUse)
                    .username("asrorsuperadmin")
                    .email("asrorsuperadmin@lmshub.uz")
                    .password(passwordEncoder.encode("ilhomhamdamarguba"))
                    .fullName("Asror Super Admin Admin")
                    .role(AppRole.SUPER_ADMIN)
                    .active(true)
                    .isGoogleUser(false)
                    .coins(0L)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin1);
        }

        // Safe Profile check for admin1
        if (!profileRepository.findByUser(admin1).isPresent()) {
            Profile profile1 = Profile.builder()
                    .user(admin1)
                    .firstName("Asror")
                    .lastName("SuperAdmin")
                    .isActive(true)
                    .build();
            profileRepository.save(profile1);
            log.info("📄 'asrorsuperadmin' profili muvaffaqiyatli bog'landi.");
        }

        // 2. Safe check for 2-SuperAdmin ('asrorsuper')
        Optional<User> adminOpt2 = userRepository.findByUsername("asrorsuper");
        User admin2;
        if (adminOpt2.isPresent()) {
            admin2 = adminOpt2.get();
            log.info("👤 Tizimda mavjud 'asrorsuper' topildi (ID: {}). Ma'lumotlarni yangilaymiz...", admin2.getId());
            admin2.setPassword(passwordEncoder.encode("asror2026"));
            admin2.setRole(AppRole.SUPER_ADMIN);
            admin2.setActive(true);
            userRepository.save(admin2);
        } else {
            log.info("🌱 'asrorsuper' topilmadi. Yangidan yaratilmoqda...");
            UUID idToUse = UUID.fromString("00000000-0000-0000-0000-000000000002");
            if (userRepository.findById(idToUse).isPresent()) {
                idToUse = UUID.randomUUID(); // Fallback if canonical ID is somehow taken
            }
            admin2 = User.builder()
                    .id(idToUse)
                    .username("asrorsuper")
                    .email("asrorsuper@lmshub.uz")
                    .password(passwordEncoder.encode("asror2026"))
                    .fullName("Asror Super Admin Simple")
                    .role(AppRole.SUPER_ADMIN)
                    .active(true)
                    .isGoogleUser(false)
                    .coins(0L)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin2);
        }

        // Safe Profile check for admin2
        if (!profileRepository.findByUser(admin2).isPresent()) {
            Profile profile2 = Profile.builder()
                    .user(admin2)
                    .firstName("Asror")
                    .lastName("Super")
                    .isActive(true)
                    .build();
            profileRepository.save(profile2);
            log.info("📄 'asrorsuper' profili muvaffaqiyatli bog'landi.");
        }

        log.info("🛡️ [SuperAdminInitializer] Barcha ishlar xavfsiz yakunlandi.");
    }
}
