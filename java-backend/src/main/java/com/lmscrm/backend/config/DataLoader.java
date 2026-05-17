package com.lmscrm.backend.config;

import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.repository.ProfileRepository;
import com.lmscrm.backend.repository.UserRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final com.lmscrm.backend.repository.PricingPlanRepository pricingPlanRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        String username = "asrorsuperadmin";
        String password = "ilhomhamdamarguba";

        log.info("🚀 DATA LOADER: Checking SuperAdmin initialization for {}...", username);

        userRepository.findByEmail(username).ifPresentOrElse(
            user -> {
                log.info("🛠 SuperAdmin exists, resetting password with fresh BCrypt hash...");
                user.setPassword(passwordEncoder.encode(password));
                userRepository.save(user);
            },
            () -> {
                log.info("🆕 SuperAdmin not found, creating new one...");
                User superAdmin = User.builder()
                        .email(username)
                        .password(passwordEncoder.encode(password))
                        .role(AppRole.SUPER_ADMIN)
                        .build();

                User savedUser = userRepository.save(superAdmin);

                Profile profile = Profile.builder()
                        .user(savedUser)
                        .firstName("Asror")
                        .lastName("SuperAdmin")
                        .isActive(true)
                        .build();

                profileRepository.save(profile);
            }
        );

        seedPricingPlans();
        seedRegularUsers();

        log.info("✅ SUCCESS: SuperAdmin check complete for {} / {}", username, password);
    }


    private void seedRegularUsers() {
        long regularUserCount = userRepository.countByRole(AppRole.USER);
        if (regularUserCount == 0) {
            log.info("🌱 Seeding regular users for leaderboard testing...");
            
            String[][] testUsers = {
                {"Ali Valiyev", "ali_google", "ali@example.com"},
                {"Olim Karimov", "olim_google", "olim@example.com"},
                {"Zuhra Azizova", "zuhra_google", "zuhra@example.com"}
            };

            for (String[] userData : testUsers) {
                int amount = (int) (Math.random() * 500) + 100;
                User user = User.builder()
                        .fullName(userData[0])
                        .username(userData[1])
                        .email(userData[2])
                        .password(passwordEncoder.encode("password123"))
                        .role(AppRole.USER)
                        .isGoogleUser(true)
                        .active(true)
                        .coins((long) amount)
                        .build();
                User savedUser = userRepository.save(user);

                Profile profile = Profile.builder()
                        .user(savedUser)
                        .firstName(userData[0].split(" ")[0])
                        .lastName(userData[0].contains(" ") ? userData[0].split(" ")[1] : "")
                        .isActive(true)
                        .build();
                profileRepository.save(profile);
            }
            log.info("✅ Regular users seeded.");
        }
    }

    private void seedPricingPlans() {
        if (pricingPlanRepository.count() == 0) {
            log.info("🌱 Seeding initial pricing plans...");
            pricingPlanRepository.save(com.lmscrm.backend.domain.entity.PricingPlan.builder()
                    .name("Basic")
                    .description("Kichik o'quv markazlari uchun")
                    .priceMonthly(BigDecimal.valueOf(500000.0))
                    .priceYearly(BigDecimal.valueOf(5000000.0))
                    .currency("UZS")
                    .features(java.util.List.of("100 tagacha talaba", "Baza statistikasi"))
                    .isActive(true)
                    .sortOrder(1)
                    .build());
            pricingPlanRepository.save(com.lmscrm.backend.domain.entity.PricingPlan.builder()
                    .name("Pro")
                    .description("O'suvchi o'quv markazlari uchun")
                    .priceMonthly(BigDecimal.valueOf(1000000.0))
                    .priceYearly(BigDecimal.valueOf(10000000.0))
                    .currency("UZS")
                    .features(java.util.List.of("500 tagacha talaba", "AI Speaking", "Mock testlar"))
                    .isPopular(true)
                    .isActive(true)
                    .sortOrder(2)
                    .build());
            pricingPlanRepository.save(com.lmscrm.backend.domain.entity.PricingPlan.builder()
                    .name("Enterprise")
                    .description("Katta o'quv markazlari uchun")
                    .priceMonthly(BigDecimal.valueOf(2000000.0))
                    .priceYearly(BigDecimal.valueOf(20000000.0))
                    .currency("UZS")
                    .features(java.util.List.of("Cheksiz talaba", "API Access", "Shaxsiy menejer"))
                    .isActive(true)
                    .sortOrder(3)
                    .build());
            log.info("✅ Seeding complete.");
        }
    }
}
