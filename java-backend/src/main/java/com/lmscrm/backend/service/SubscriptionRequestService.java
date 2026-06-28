package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.SubscriptionPack;
import com.lmscrm.backend.domain.entity.SubscriptionRequest;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.UserSubscription;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.repository.DbStoredFileRepository;
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
    private final DbStoredFileRepository dbStoredFileRepository;
    private final com.lmscrm.backend.repository.UserSubscriptionRepository userSubscriptionRepository;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Transactional
    public SubscriptionRequest createRequest(String username, UUID packId, String receiptUrl) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        SubscriptionPack pack = packRepository.findById(packId)
                .orElseThrow(() -> new RuntimeException("Pack not found"));

        // Double purchase check
        String userIdStr = user.getId().toString();
        String packIdStr = pack.getId().toString();
        try {
            List<?> activeSubs = entityManager.createNativeQuery(
                "SELECT id FROM public.user_subscriptions " +
                "WHERE user_id = CAST(:userId AS UUID) AND pack_id = CAST(:packId AS UUID) " +
                "AND is_active = true AND expires_at > NOW()"
            )
            .setParameter("userId", userIdStr)
            .setParameter("packId", packIdStr)
            .getResultList();

            if (!activeSubs.isEmpty()) {
                throw new com.lmscrm.backend.exception.BusinessException("Sizda ushbu paketning aktiv obunasi mavjud");
            }
        } catch (com.lmscrm.backend.exception.BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error checking active subscription: {}", e.getMessage());
        }

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
            "📦 <b>Yangi Obuna So'rovi!</b>\n\n" +
            "👤 <b>Foydalanuvchi:</b> %s (@%s)\n" +
            "📧 <b>Gmail:</b> %s\n" +
            "📞 <b>Telefon:</b> %s\n" +
            "📦 <b>Paket:</b> %s (%s)\n" +
            "💰 <b>Narxi:</b> %s UZS\n" +
            "🕒 <b>Vaqt:</b> %s\n\n" +
            "Tasdiqlash yoki rad etish uchun quyidagi tugmalarni bosing.",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getTelegramUsername() != null ? user.getTelegramUsername() : user.getUsername(),
            user.getEmail() != null ? user.getEmail() : "Kiritilmagan",
            user.getPhoneNumber() != null ? user.getPhoneNumber() : "Kiritilmagan",
            pack.getName(),
            pack.getType(),
            pack.getPrice(),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );

        String adminChatId = telegramBotService.getDefaultChatId();
        String approveCallback = "approve_sub:" + saved.getId();
        String rejectCallback = "reject_sub:" + saved.getId();

        if (receiptUrl != null && !receiptUrl.isBlank()) {
            boolean sent = false;
            if (receiptUrl.contains("/view/")) {
                String dbKey = receiptUrl.substring(receiptUrl.lastIndexOf("/view/") + 6);
                java.util.Optional<com.lmscrm.backend.domain.entity.DbStoredFile> optFile = dbStoredFileRepository.findByFilename(dbKey);
                if (optFile.isPresent()) {
                    com.lmscrm.backend.domain.entity.DbStoredFile storedFile = optFile.get();
                    if ("DB".equals(storedFile.getStorageType())) {
                        org.springframework.core.io.Resource resource = new org.springframework.core.io.ByteArrayResource(storedFile.getData()) {
                            @Override
                            public String getFilename() {
                                return "receipt.jpg"; // Provide a default filename for Telegram
                            }
                        };
                        telegramBotService.sendPhotoWithInlineButtons(adminChatId, message, resource, approveCallback, rejectCallback);
                        sent = true;
                    } else {
                        String localFilePath = storedFile.getPath();
                        if (localFilePath != null && new java.io.File(localFilePath).exists()) {
                            telegramBotService.sendPhotoWithInlineButtons(adminChatId, message, localFilePath, approveCallback, rejectCallback);
                            sent = true;
                        }
                    }
                }
            }
            
            if (!sent) {
                String fullUrl = receiptUrl.startsWith("http") ? receiptUrl : (telegramBotService.getSiteUrl() + receiptUrl);
                telegramBotService.sendPhotoWithInlineButtons(adminChatId, message, fullUrl, approveCallback, rejectCallback);
            }
        } else {
            telegramBotService.sendMessageWithInlineButtons(adminChatId, message, approveCallback, rejectCallback);
        }

        // 2. Send in-app site notifications to all SUPER_ADMIN and PACK_MANAGER users
        String notifTitle = "📦 Yangi obuna so'rovi";
        String notifMsg = String.format(
            "%s (@%s) – %s paketi uchun to'lov qildi. So'rov kutilmoqda!",
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

        // 1. Keep user role in their own role (no automatic upgrade to STUDENT)
        User user = request.getUser();
        log.info("ℹ Step 2: User {} remains in role {}", user.getUsername(), user.getRole());

        // 2. Insert or update user_subscriptions table
        SubscriptionPack pack = request.getPack();

        // Increment totalPurchases counter on the pack safely
        int currentPurchases = pack.getTotalPurchases() != null ? pack.getTotalPurchases() : 0;
        pack.setTotalPurchases(currentPurchases + 1);
        packRepository.save(pack);
        log.info("✅ Step 3: totalPurchases incremented for pack: {}", pack.getName());

        int durationDays = (pack.getDurationDays() != null && pack.getDurationDays() > 0) ? pack.getDurationDays() : 30;
        LocalDateTime startsAt = LocalDateTime.now();
        LocalDateTime expiresAt = startsAt.plusDays(durationDays);

        // Use String UUIDs for PostgreSQL compatibility
        String userIdStr = user.getId().toString();
        String packIdStr = pack.getId().toString();

        try {
            // Find existing user subscription via repository to ensure Hibernate cache consistency
            List<UserSubscription> userSubs = userSubscriptionRepository.findByUserId(user.getId());
            UserSubscription sub = userSubs.stream()
                .filter(s -> s.getPack() != null && s.getPack().getId().equals(pack.getId()))
                .findFirst()
                .orElse(null);

            if (sub != null) {
                // Update existing subscription
                sub.setStartsAt(startsAt);
                sub.setExpiresAt(expiresAt);
                sub.setIsActive(true);
                sub.setStatus("active");
                userSubscriptionRepository.save(sub);
                log.info("✅ Step 4: user_subscriptions UPDATED (JPA) for user {}", user.getUsername());
            } else {
                // Create new subscription
                UserSubscription newSub = UserSubscription.builder()
                    .user(user)
                    .pack(pack)
                    .startsAt(startsAt)
                    .expiresAt(expiresAt)
                    .isActive(true)
                    .status("active")
                    .createdAt(LocalDateTime.now())
                    .build();
                userSubscriptionRepository.save(newSub);
                log.info("✅ Step 4: user_subscriptions INSERTED (JPA) for user {}", user.getUsername());
            }
        } catch (Exception e) {
            log.error("❌ Step 4 FAILED (user_subscriptions JPA): {}", e.getMessage(), e);
            throw new RuntimeException("Obuna jadvaliga yozishda xatolik: " + e.getMessage(), e);
        }

        // 3. Notify and 4. In-App notification
        notificationService.createNotification(
            user,
            "Obunangiz muvaffaqiyatli faollashtirildi",
            String.format("Tabriklaymiz! Sizning %s paketingiz muvaffaqiyatli faollashtirildi. Endi testlarni ishlashingiz mumkin.", pack.getName()),
            NotificationType.INFO
        );

        // 5. Telegram notification to the user
        if (user.getTelegramChatId() != null) {
            String userMsg = String.format(
                "🎉 <b>Tabriklaymiz!</b>\n\nSizning <b>%s</b> paketingiz ma'muriyat tomonidan tasdiqlandi!\n\nEndi saytga kirib, testlarni to'liq ishlashingiz mumkin. Omad yor bo'lsin!",
                pack.getName()
            );
            telegramBotService.sendMessageTo(user.getTelegramChatId(), userMsg);
        }

        log.info("✅ Step 5: Notifications sent");

        // 4. Send Telegram Notification (only if not system auto-approval to prevent duplicate logs)
        if (!"SYSTEM_AUTO".equals(adminUsername)) {
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
        }
        log.info("▶ approveRequest DONE: user={}, pack={}", user.getUsername(), pack.getName());
    }


    @Transactional
    public void rejectRequest(UUID requestId, String adminUsername) {
        rejectRequest(requestId, adminUsername, null);
    }

    @Transactional
    public void rejectRequest(UUID requestId, String adminUsername, String reason) {
        SubscriptionRequest request = repository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        request.setStatus("REJECTED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(adminUsername);
        request.setRejectionReason(reason);
        repository.save(request);

        // Notify the requesting user
        User user = request.getUser();
        SubscriptionPack pack = request.getPack();
        
        String rejectMsg = "Obunangiz rad etildi.";
        if (reason != null && !reason.isBlank()) {
            rejectMsg = String.format("Obunangiz rad etildi. Sabab: %s", reason);
        }
        
        notificationService.createNotification(user,
            "Obunangiz rad etildi",
            rejectMsg,
            NotificationType.ALERT
        );

        // Telegram notification
        String tgMsg = String.format(
            "❌ <b>Obuna So'rovi Rad Etildi!</b>\n\n" +
            "👤 <b>Foydalanuvchi:</b> %s (@%s)\n" +
            "📦 <b>Paket:</b> %s\n" +
            "🛡 <b>Admin:</b> %s\n" +
            (reason != null && !reason.isBlank() ? "📝 <b>Sabab:</b> " + reason + "\n" : "") +
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
