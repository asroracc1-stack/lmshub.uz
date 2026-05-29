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
    private final com.lmscrm.backend.repository.AuditLogRepository auditLogRepository;

    @org.springframework.beans.factory.annotation.Value("${telegram.bot.chat-id:7499973776}")
    private String defaultChatId;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("🛡️ [SuperAdminInitializer] Mutloq va Haqiqiy SuperAdmin Loader: Xavfsiz rejimda ishga tushmoqda...");

        // 1. Safe check for 1-SuperAdmin ('asrorsuperadmin')
        Optional<User> adminOpt1 = userRepository.findByUsername("asrorsuperadmin");
        User admin1;
        if (adminOpt1.isPresent()) {
            admin1 = adminOpt1.get();
            log.info("👤 Tizimda mavjud 'asrorsuperadmin' topildi (ID: {}). Faqat rol kafolatlanmoqda...", admin1.getId());
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
            log.info("👤 Tizimda mavjud 'asrorsuper' topildi (ID: {}). Faqat rol kafolatlanmoqda...", admin2.getId());
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

        // 2.5. Safe check for 3-SuperAdmin ('asror')
        Optional<User> adminOpt3 = userRepository.findByUsername("asror");
        User admin3;
        if (adminOpt3.isPresent()) {
            admin3 = adminOpt3.get();
            log.info("👤 Tizimda mavjud 'asror' topildi (ID: {}). Faqat rol kafolatlanmoqda...", admin3.getId());
            admin3.setRole(AppRole.SUPER_ADMIN);
            admin3.setActive(true);
            userRepository.save(admin3);
        } else {
            log.info("🌱 'asror' topilmadi. Yangidan yaratilmoqda...");
            admin3 = User.builder()
                    .username("asror")
                    .email("asror@lmshub.uz")
                    .password(passwordEncoder.encode("123456"))
                    .fullName("Asror Super Admin Main")
                    .role(AppRole.SUPER_ADMIN)
                    .active(true)
                    .isGoogleUser(false)
                    .coins(0L)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin3);
        }

        // Safe Profile check for admin3
        if (!profileRepository.findByUser(admin3).isPresent()) {
            Profile profile3 = Profile.builder()
                    .user(admin3)
                    .firstName("Asror")
                    .lastName("Developer")
                    .isActive(true)
                    .build();
            profileRepository.save(profile3);
            log.info("📄 'asror' profili muvaffaqiyatli bog'landi.");
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

        // 5. Seed Demo Audit Logs
        if (auditLogRepository.count() == 0) {
            log.info("🌱 Seeding Demo Audit Logs for SuperAdmin dashboard...");
            seedAuditLog("CREATE", "Organization", "PDP Academy yaratildi", "asrorsuperadmin", 5);
            seedAuditLog("UPDATE", "User", "Super Admin paroli tiklandi", "SYSTEM", 10);
            seedAuditLog("CREATE", "User", "Yangi o'qituvchi qo'shildi: Branch Teacher", "admin", 25);
            seedAuditLog("UPDATE", "System", "Tizim keshi muvaffaqiyatli tozalandi", "asrorsuper", 45);
            seedAuditLog("LOGIN", "User", "Super admin tizimga muvaffaqiyatli kirdi", "asror", 60);
        }

        log.info("🛡️ [SuperAdminInitializer] Barcha ishlar xavfsiz yakunlandi.");
    }

    private void seedAuditLog(String action, String objectType, String details, String username, int minusMinutes) {
        com.lmscrm.backend.domain.entity.AuditLog log = com.lmscrm.backend.domain.entity.AuditLog.builder()
                .action(action)
                .objectType(objectType)
                .objectId("N/A")
                .username(username)
                .details(details)
                .createdAt(LocalDateTime.now().minusMinutes(minusMinutes))
                .build();
        auditLogRepository.save(log);
    }

    private void seedDemoUser(String username, String email, AppRole role, String fullName, UUID orgId, String cardNum, String cardHolder) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        
        // Calculate historical createdAt based on role for realistic growth chart
        LocalDateTime historicalCreatedAt;
        if (role == AppRole.USER) historicalCreatedAt = LocalDateTime.now().minusMonths(5);
        else if (role == AppRole.ADMIN) historicalCreatedAt = LocalDateTime.now().minusMonths(4);
        else if (role == AppRole.ADMINISTRATOR) historicalCreatedAt = LocalDateTime.now().minusMonths(3);
        else if (role == AppRole.TEACHER) historicalCreatedAt = LocalDateTime.now().minusMonths(2);
        else if (role == AppRole.STUDENT) historicalCreatedAt = LocalDateTime.now().minusMonths(1);
        else historicalCreatedAt = LocalDateTime.now();

        User user;
        if (!userOpt.isPresent()) {
            log.info("🌱 Demo '{}' foydalanuvchisi topilmadi. Yangidan yaratilmoqda...", username);
            
            // Check if email already exists for another user to avoid unique constraint violation
            Optional<User> existingEmailUser = userRepository.findByEmail(email);
            if (existingEmailUser.isPresent()) {
                email = username + "_" + System.currentTimeMillis() + "@lmshub.uz";
                log.info("⚠️ '{}' emaili allaqachon mavjud, shuning uchun '{}' ga o'zgartirildi.", username, email);
            }

            user = User.builder()
                    .username(username)
                    .email(email)
                    .password(passwordEncoder.encode("123456"))
                    .fullName(fullName)
                    .role(role)
                    .organizationId(orgId)
                    .cardNumber(cardNum)
                    .cardHolder(cardHolder)
                    .telegramChatId(defaultChatId)
                    .active(true)
                    .isGoogleUser(false)
                    .coins(100L)
                    .createdAt(historicalCreatedAt)
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
            // We NO LONGER overwrite password, organizationId, card details, or telegramChatId here
            // so that if an admin changes them from the UI, they persist across restarts.
            user.setCreatedAt(historicalCreatedAt); // Only update historical created_at for chart testing
            userRepository.save(user);
            log.info("👤 Demo '{}' mavjud, faqat sanasi yangilandi (eski ma'lumotlari saqlab qolindi).", username);
        }
    }
}
