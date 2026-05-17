package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.SubscriptionPack;
import com.lmscrm.backend.domain.entity.SubscriptionRequest;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.SubscriptionPackRepository;
import com.lmscrm.backend.repository.SubscriptionRequestRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubscriptionRequestService {

    private final SubscriptionRequestRepository repository;
    private final SubscriptionPackRepository packRepository;
    private final UserRepository userRepository;
    private final TelegramBotService telegramBotService;

    @Transactional
    public SubscriptionRequest createRequest(String username, UUID packId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        SubscriptionPack pack = packRepository.findById(packId)
                .orElseThrow(() -> new RuntimeException("Pack not found"));

        SubscriptionRequest request = SubscriptionRequest.builder()
                .user(user)
                .pack(pack)
                .requestedAt(LocalDateTime.now())
                .status("PENDING")
                .build();

        SubscriptionRequest saved = repository.save(request);

        // Send Telegram Notification
        String message = String.format(
            "🚀 <b>Yangi Obuna So'rovi!</b>\n\n" +
            "👤 <b>Foydalanuvchi:</b> %s (@%s)\n" +
            "📦 <b>Paket:</b> %s (%s)\n" +
            "💰 <b>Narxi:</b> %s UZS\n" +
            "🕒 <b>Vaqt:</b> %s\n\n" +
            "✅ Iltimos, saytdan yoki bot orqali faollashtiring!",
            user.getFullName() != null ? user.getFullName() : user.getUsername(),
            user.getUsername(),
            pack.getName(),
            pack.getType(),
            pack.getPrice(),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
        telegramBotService.sendMessage(message);

        return saved;
    }

    public List<SubscriptionRequest> getAllRequests() {
        return repository.findAllByOrderByRequestedAtDesc();
    }

    @Transactional
    public void approveRequest(UUID requestId, String adminUsername) {
        SubscriptionRequest request = repository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        
        request.setStatus("APPROVED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(adminUsername);
        
        // Update user's subscription status logic could go here
        // For now we just update the request
        repository.save(request);
    }
}
