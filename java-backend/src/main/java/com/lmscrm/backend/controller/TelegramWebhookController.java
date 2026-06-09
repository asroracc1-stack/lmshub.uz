package com.lmscrm.backend.controller;

import com.lmscrm.backend.service.SubscriptionRequestService;
import com.lmscrm.backend.service.TelegramBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/telegram/webhook")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final SubscriptionRequestService subscriptionRequestService;
    private final TelegramBotService telegramBotService;

    @Value("${telegram.bot.chat-id:7499973776}")
    private String adminChatId;

    @PostMapping
    public ResponseEntity<?> handleUpdate(@RequestBody Map<String, Object> update) {
        log.info("Received Telegram Update payload: {}", update);
        try {
            if (update.containsKey("callback_query")) {
                Map<String, Object> callbackQuery = (Map<String, Object>) update.get("callback_query");
                String queryId = (String) callbackQuery.get("id");
                
                Map<String, Object> from = (Map<String, Object>) callbackQuery.get("from");
                Number fromId = (Number) from.get("id");

                long adminChatIdLong = Long.parseLong(adminChatId);
                if (fromId == null || fromId.longValue() != adminChatIdLong) {
                    telegramBotService.answerCallbackQuery(queryId, "Sizga ruxsat etilmagan!", true);
                    return ResponseEntity.ok().build();
                }

                String data = (String) callbackQuery.get("data");
                Map<String, Object> message = (Map<String, Object>) callbackQuery.get("message");
                Integer messageId = (Integer) message.get("message_id");

                if (data == null) {
                    return ResponseEntity.ok().build();
                }

                if (data.startsWith("approve_sub:")) {
                    String reqIdStr = data.substring("approve_sub:".length());
                    UUID requestId = UUID.fromString(reqIdStr);
                    
                    subscriptionRequestService.approveRequest(requestId, "Telegram Bot (Admin)");
                    telegramBotService.answerCallbackQuery(queryId, "Obuna tasdiqlandi! ✅", false);

                    if (message.containsKey("caption")) {
                        String caption = (String) message.get("caption");
                        telegramBotService.editMessageCaption(Long.parseLong(adminChatId), messageId, caption + "\n\n✅ <b>Tasdiqlandi</b> (Bot orqali)");
                    } else if (message.containsKey("text")) {
                        String text = (String) message.get("text");
                        telegramBotService.editMessageText(Long.parseLong(adminChatId), messageId, text + "\n\n✅ <b>Tasdiqlandi</b> (Bot orqali)");
                    }
                } else if (data.startsWith("reject_sub:")) {
                    String reqIdStr = data.substring("reject_sub:".length());
                    UUID requestId = UUID.fromString(reqIdStr);
                    
                    subscriptionRequestService.rejectRequest(requestId, "Telegram Bot (Admin)");
                    telegramBotService.answerCallbackQuery(queryId, "Obuna rad etildi! ❌", false);

                    if (message.containsKey("caption")) {
                        String caption = (String) message.get("caption");
                        telegramBotService.editMessageCaption(Long.parseLong(adminChatId), messageId, caption + "\n\n❌ <b>Rad etildi</b> (Bot orqali)");
                    } else if (message.containsKey("text")) {
                        String text = (String) message.get("text");
                        telegramBotService.editMessageText(Long.parseLong(adminChatId), messageId, text + "\n\n❌ <b>Rad etildi</b> (Bot orqali)");
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error handling Telegram Webhook update: {}", e.getMessage(), e);
        }
        return ResponseEntity.ok().build();
    }
}
