package com.lmscrm.backend.config;

import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.repository.OrganizationRepository;
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
    private final OrganizationRepository organizationRepository;
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
            admin1 = User.builder()
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
            admin2 = User.builder()
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

        // 3. Seed Default Organization
        Organization org = organizationRepository.findBySlug("lmshub-head-office").orElse(null);
        if (org == null) {
            org = Organization.builder()
                    .name("LMSHub Head Office")
                    .slug("lmshub-head-office")
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .build();
            org = organizationRepository.save(org);
            log.info("🏢 Default Organization 'LMSHub Head Office' yaratildi.");
        }
        UUID orgId = org.getId();

        // 4. Seed Demo Users for each role (with password '123456')
        seedDemoUser("admin", "admin@lmshub.uz", AppRole.ADMIN, "Branch Admin", orgId, "8600123456789012", "Asror Coder");
        seedDemoUser("administrator", "administrator@lmshub.uz", AppRole.ADMINISTRATOR, "Branch Administrator", orgId, "8600987654321098", "Asror Reception");
        seedDemoUser("teacher", "teacher@lmshub.uz", AppRole.TEACHER, "Branch Teacher", orgId, null, null);
        seedDemoUser("student", "student@lmshub.uz", AppRole.STUDENT, "Branch Student", orgId, null, null);
        seedDemoUser("parent", "parent@lmshub.uz", AppRole.PARENT, "Branch Parent", orgId, null, null);
        seedDemoUser("manager", "manager@lmshub.uz", AppRole.PAYMENT_MANAGER, "Branch Pack Manager", orgId, null, null);
        seedDemoUser("user", "user@lmshub.uz", AppRole.USER, "Branch Regular User", orgId, null, null);

        log.info("🛡️ [SuperAdminInitializer] Barcha ishlar xavfsiz yakunlandi.");
    }

    private void seedDemoUser(String username, String email, AppRole role, String fullName, UUID orgId, String cardNum, String cardHolder) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        User user;
        if (!userOpt.isPresent()) {
            log.info("🌱 Demo '{}' foydalanuvchisi topilmadi. Yangidan yaratilmoqda...", username);
            user = User.builder()
                    .username(username)
                    .email(email)
                    .password(passwordEncoder.encode("123456"))
                    .fullName(fullName)
                    .role(role)
                    .organizationId(orgId)
                    .cardNumber(cardNum)
                    .cardHolder(cardHolder)
                    .active(true)
                    .isGoogleUser(false)
                    .coins(100L)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(user);

            Profile profile = Profile.builder()
                    .user(user)
                    .firstName(fullName.split(" ")[0])
                    .lastName(fullName.split(" ").length > 1 ? fullName.split(" ")[1] : "")
                    .isActive(true)
                    .build();
            profileRepository.save(profile);
            log.info("✅ Demo '{}' va uning profili muvaffaqiyatli yaratildi.", username);
        } else {
            user = userOpt.get();
            user.setPassword(passwordEncoder.encode("123456"));
            user.setOrganizationId(orgId);
            if (cardNum != null) user.setCardNumber(cardNum);
            if (cardHolder != null) user.setCardHolder(cardHolder);
            userRepository.save(user);
            log.info("👤 Demo '{}' mavjud, ma'lumotlari yangilandi.", username);
        }
    }
}
