package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.SubscriptionPack;
import com.lmscrm.backend.repository.SubscriptionPackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubscriptionPackService {

    private final SubscriptionPackRepository repository;
    private final TelegramBotService telegramBotService;

    @Transactional(readOnly = true)
    public List<SubscriptionPack> getAllPacks() {
        return repository.findAll();
    }

    @Transactional
    public SubscriptionPack createPack(SubscriptionPack pack) {
        if (Boolean.TRUE.equals(pack.getIsPopular())) {
            repository.findAll().forEach(p -> {
                if (Boolean.TRUE.equals(p.getIsPopular())) {
                    p.setIsPopular(false);
                    repository.save(p);
                }
            });
        }
        return repository.save(pack);
    }

    @Transactional
    public SubscriptionPack updatePack(UUID id, SubscriptionPack details) {
        SubscriptionPack pack = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pack not found"));
        
        if (Boolean.TRUE.equals(details.getIsPopular())) {
            repository.findAll().forEach(p -> {
                if (Boolean.TRUE.equals(p.getIsPopular()) && !p.getId().equals(id)) {
                    p.setIsPopular(false);
                    repository.save(p);
                }
            });
        }

        pack.setCode(details.getCode());
        pack.setName(details.getName());
        pack.setPrice(details.getPrice());
        pack.setDuration(details.getDuration());
        pack.setFeatures(details.getFeatures());
        pack.setIsPopular(details.getIsPopular());
        pack.setStatus(details.getStatus());
        pack.setType(details.getType());
        if (details.getTotalPurchases() != null) {
            pack.setTotalPurchases(details.getTotalPurchases());
        }
        
        SubscriptionPack updated = repository.save(pack);

        // Notify via Telegram
        String message = String.format(
            "✏️ <b>Paket Tahrirlandi!</b>\n\n" +
            "📦 <b>Paket:</b> %s (%s)\n" +
            "💰 <b>Yangi Narx:</b> %s UZS\n" +
            "🕒 <b>Vaqt:</b> %s\n\n" +
            "✅ Ma'lumotlar muvaffaqiyatli yangilandi!",
            updated.getName(),
            updated.getType(),
            updated.getPrice(),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
        telegramBotService.sendMessage(message);

        return updated;
    }

    @Transactional
    public void deletePack(UUID id) {
        repository.deleteById(id);
    }
}
