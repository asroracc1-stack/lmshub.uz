package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.SubscriptionPack;
import com.lmscrm.backend.domain.entity.SubscriptionRequest;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.repository.SubscriptionPackRepository;
import com.lmscrm.backend.repository.SubscriptionRequestRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.communication.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionRequestService {

    private final SubscriptionRequestRepository repository;
    private final SubscriptionPackRepository packRepository;
    private final UserRepository userRepository;
    private final TelegramBotService telegramBotService;
    private final NotificationService notificationService;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Transactional
    public SubscriptionRequest createRequest(String username, UUID packId, String receiptUrl) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        SubscriptionPack pack = packRepository.findById(packId)
                .orElseThrow(() -> new RuntimeException("Pack not found"));

        SubscriptionRequest request = SubscriptionRequest.builder()
                .user(user)
                .pack(pack)
                .requestedAt(LocalDateTime.now())
                .status("PENDING")
                .receiptUrl(receiptUrl)
                .build();

        SubscriptionRequest saved = repository.save(request);

        // 1. Send Telegram Notification
        String message = String.format(
            "🚀 <b>Yangi Obuna So'rovi!</b>\n\n" +
            "👤 <b>Foydalanuvchi:</b> %s (@%s)\n" +
            "📧 <b>Gmail:</b> %s\n" +
            "📞 <b>Telefon:</b> %s\n" +
            "📦 <b>Paket:</b> %s (%s)\n" +
            "💰 <b>Narxi:</b> %s UZS\n" +
            "🕒 <b>Vaqt:</b> %s\n\n" +
            "Tasdiqlash yoki rad etish uchun quyidagi tugmalarni bosing:",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            user.getEmail() != null ? user.getEmail() : "Kiritilmagan",
            user.getPhoneNumber() != null ? user.getPhoneNumber() : "Kiritilmagan",
            pack.getName(),
            pack.getType(),
            pack.getPrice(),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );

        String approveCallback = "approve_sub:" + saved.getId();
        String rejectCallback = "reject_sub:" + saved.getId();

        String adminChatId = telegramBotService.getDefaultChatId();
        if (receiptUrl != null && !receiptUrl.isBlank()) {
            String localFilePath = null;
            if (receiptUrl.contains("/view/")) {
                String filename = receiptUrl.substring(receiptUrl.lastIndexOf("/view/") + 6);
                localFilePath = "uploads/" + filename;
            }
            if (localFilePath != null && new java.io.File(localFilePath).exists()) {
                telegramBotService.sendPhotoWithInlineButtons(adminChatId, message, localFilePath, approveCallback, rejectCallback);
            } else {
                String fullUrl = receiptUrl.startsWith("http") ? receiptUrl : (telegramBotService.getSiteUrl() + receiptUrl);
                telegramBotService.sendPhotoWithInlineButtons(adminChatId, message, fullUrl, approveCallback, rejectCallback);
            }
        } else {
            telegramBotService.sendMessageWithInlineButtons(adminChatId, message, approveCallback, rejectCallback);
        }

        // 2. Send in-app site notifications to all SUPER_ADMIN and PACK_MANAGER users
        String notifTitle = "📦 Yangi obuna so'rovi";
        String notifMsg = String.format(
            "%s (@%s) – %s paketini sotib olishni so'radi. Tasdiqlang!",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            pack.getName()
        );
        List<User> admins = userRepository.findByRole(AppRole.SUPER_ADMIN);
        List<User> packManagers = userRepository.findByRole(AppRole.PACK_MANAGER);
        for (User admin : admins) {
            notificationService.createNotification(admin, notifTitle, notifMsg, NotificationType.ALERT);
        }
        for (User pm : packManagers) {
            notificationService.createNotification(pm, notifTitle, notifMsg, NotificationType.ALERT);
        }

        return saved;
    }

    public List<SubscriptionRequest> getAllRequests() {
        return repository.findAllByOrderByRequestedAtDesc();
    }

    @Transactional
    public void approveRequest(UUID requestId, String adminUsername) {
        log.info("▶ approveRequest START: requestId={}, admin={}", requestId, adminUsername);

        SubscriptionRequest request = repository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        request.setStatus("APPROVED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(adminUsername);
        repository.save(request);
        log.info("✅ Step 1: Status APPROVED saved");

        // 1. Upgrade user role from USER to STUDENT
        User user = request.getUser();
        if (user.getRole() == AppRole.USER) {
            user.setRole(AppRole.STUDENT);
            userRepository.save(user);
            log.info("✅ Step 2: User role upgraded to STUDENT: {}", user.getUsername());
        } else {
            log.info("ℹ Step 2: User {} already has role {}", user.getUsername(), user.getRole());
        }

        // 2. Insert or update user_subscriptions table
        SubscriptionPack pack = request.getPack();

        // Increment totalPurchases counter on the pack
        pack.setTotalPurchases(pack.getTotalPurchases() + 1);
        packRepository.save(pack);
        log.info("✅ Step 3: totalPurchases incremented for pack: {}", pack.getName());

        int durationMonths = pack.getDuration() > 0 ? pack.getDuration() : 12;
        LocalDateTime startsAt = LocalDateTime.now();
        LocalDateTime expiresAt = startsAt.plusMonths(durationMonths);

        // Ensure user_subscriptions table exists
        try {
            entityManager.createNativeQuery(
                "CREATE TABLE IF NOT EXISTS public.user_subscriptions (" +
                "  id UUID PRIMARY KEY, " +
                "  user_id UUID NOT NULL, " +
                "  pack_id UUID NOT NULL, " +
                "  starts_at TIMESTAMP, " +
                "  expires_at TIMESTAMP, " +
                "  is_active BOOLEAN DEFAULT true, " +
                "  status VARCHAR(50) DEFAULT 'active', " +
                "  created_at TIMESTAMP DEFAULT NOW()" +
                ")"
            ).executeUpdate();
            log.info("✅ Step 4: user_subscriptions table ensured");
        } catch (Exception e) {
            log.warn("⚠ Step 4: Could not create table (may already exist): {}", e.getMessage());
        }

        // Use String UUIDs for PostgreSQL compatibility
        String userIdStr = user.getId().toString();
        String packIdStr = pack.getId().toString();

        try {
            List<?> existing = entityManager.createNativeQuery(
                "SELECT id FROM public.user_subscriptions WHERE user_id = CAST(:userId AS UUID) AND pack_id = CAST(:packId AS UUID)"
            )
            .setParameter("userId", userIdStr)
            .setParameter("packId", packIdStr)
            .getResultList();

            if (!existing.isEmpty()) {
                entityManager.createNativeQuery(
                    "UPDATE public.user_subscriptions SET starts_at = :startsAt, expires_at = :expiresAt, " +
                    "is_active = true, status = 'active' " +
                    "WHERE user_id = CAST(:userId AS UUID) AND pack_id = CAST(:packId AS UUID)"
                )
                .setParameter("userId", userIdStr)
                .setParameter("packId", packIdStr)
                .setParameter("startsAt", startsAt)
                .setParameter("expiresAt", expiresAt)
                .executeUpdate();
                log.info("✅ Step 5: user_subscriptions UPDATED for user {}", user.getUsername());
            } else {
                entityManager.createNativeQuery(
                    "INSERT INTO public.user_subscriptions (id, user_id, pack_id, starts_at, expires_at, is_active, status, created_at) " +
                    "VALUES (CAST(:id AS UUID), CAST(:userId AS UUID), CAST(:packId AS UUID), :startsAt, :expiresAt, true, 'active', :createdAt)"
                )
                .setParameter("id", UUID.randomUUID().toString())
                .setParameter("userId", userIdStr)
                .setParameter("packId", packIdStr)
                .setParameter("startsAt", startsAt)
                .setParameter("expiresAt", expiresAt)
                .setParameter("createdAt", LocalDateTime.now())
                .executeUpdate();
                log.info("✅ Step 5: user_subscriptions INSERTED for user {}", user.getUsername());
            }
        } catch (Exception e) {
            log.error("❌ Step 5 FAILED (user_subscriptions): {}", e.getMessage(), e);
            throw new RuntimeException("Obuna jadvaliga yozishda xatolik: " + e.getMessage(), e);
        }

        // 3. Notify user via in-app notification
        notificationService.createNotification(user,
            "✅ Obunangiz faollashtirildi!",
            String.format("%s paketi faollashtirildi. %s gacha amal qiladi. Barcha premium imkoniyatlardan foydalaning!",
                pack.getName(), expiresAt.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))),
            NotificationType.ALERT
        );
        log.info("✅ Step 6: In-app notification sent to user {}", user.getUsername());

        // 4. Send Telegram Notification
        String tgMsg = String.format(
            "✅ <b>Obuna Faollashtirildi!</b>\n\n" +
            "👤 <b>Foydalanuvchi:</b> %s (@%s)\n" +
            "📦 <b>Paket:</b> %s (%s)\n" +
            "📅 <b>Tugash sanasi:</b> %s\n\n" +
            "🎉 Foydalanuvchi tizimdan to'liq foydalanishi mumkin!",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            pack.getName(),
            pack.getType(),
            expiresAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
        telegramBotService.sendMessage(tgMsg);
        log.info("▶ approveRequest DONE: user={}, pack={}", user.getUsername(), pack.getName());
    }


    @Transactional
    public void rejectRequest(UUID requestId, String adminUsername) {
        SubscriptionRequest request = repository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        request.setStatus("REJECTED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(adminUsername);
        repository.save(request);

        // Notify the requesting user
        User user = request.getUser();
        SubscriptionPack pack = request.getPack();
        notificationService.createNotification(user,
            "❌ Obuna so'rovi rad etildi",
            String.format("%s uchun so'rovingiz %s tomonidan ko'rib chiqildi va rad etildi. Qo'shimcha ma'lumot uchun adminlar bilan bog'laning.",
                pack.getName(), adminUsername),
            NotificationType.ALERT
        );

        // Telegram notification
        String tgMsg = String.format(
            "❌ <b>Obuna So'rovi Rad Etildi!</b>\n\n" +
            "👤 <b>Foydalanuvchi:</b> %s (@%s)\n" +
            "📦 <b>Paket:</b> %s\n" +
            "🛡 <b>Admin:</b> %s\n" +
            "🕒 <b>Vaqt:</b> %s",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            pack.getName(),
            adminUsername,
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
        telegramBotService.sendMessage(tgMsg);
    }
}
