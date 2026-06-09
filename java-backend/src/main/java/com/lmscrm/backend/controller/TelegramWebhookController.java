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
@RequestMapping("/api/v1/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final SubscriptionRequestService subscriptionRequestService;
    private final TelegramBotService telegramBotService;
    private final com.lmscrm.backend.bot.TelegramBotDispatcher telegramBotDispatcher;

    @Value("${telegram.bot.chat-id:7499973776}")
    private String adminChatId;

    /**
     * Manual endpoint to re-register Telegram webhook.
     * Call this after deployment: GET /api/v1/telegram/register
     */
    @GetMapping("/register")
    public ResponseEntity<String> registerWebhook() {
        try {
            telegramBotService.registerWebhook();
            return ResponseEntity.ok("✅ Webhook muvaffaqiyatli ro'yxatdan o'tdi!");
        } catch (Exception e) {
            log.error("Webhook re-registration failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("❌ Xatolik: " + e.getMessage());
        }
    }

    /**
     * Main Telegram webhook endpoint.
     * Telegram sends all updates here.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleUpdate(@RequestBody Map<String, Object> update) {
        log.info("📩 Telegram Update received: {}", update);

        try {
            if (!update.containsKey("callback_query")) {
                telegramBotDispatcher.dispatch(update);
                return ResponseEntity.ok().build();
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> callbackQuery = (Map<String, Object>) update.get("callback_query");
            String queryId = (String) callbackQuery.get("id");
            String data    = (String) callbackQuery.get("data");

            @SuppressWarnings("unchecked")
            Map<String, Object> from = (Map<String, Object>) callbackQuery.get("from");
            Number fromId = from != null ? (Number) from.get("id") : null;

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) callbackQuery.get("message");
            Integer messageId = message != null ? (Integer) message.get("message_id") : null;

            log.info("📌 Callback: queryId={}, data={}, fromId={}, messageId={}", queryId, data, fromId, messageId);

            if (data == null || queryId == null) {
                telegramBotDispatcher.dispatch(update);
                return ResponseEntity.ok().build();
            }

            // ─── APPROVE ────────────────────────────────────────────────────
            if (data.startsWith("approve_sub:")) {
                String reqIdStr = data.substring("approve_sub:".length()).trim();
                log.info("🟢 APPROVE request: {}", reqIdStr);

                // 1. Immediately acknowledge Telegram button press
                telegramBotService.answerCallbackQuery(queryId, "⏳ Tasdiqlanmoqda...", false);

                try {
                    UUID requestId = UUID.fromString(reqIdStr);
                    subscriptionRequestService.approveRequest(requestId, "Telegram Bot (Admin)");
                    log.info("✅ Subscription approved: {}", requestId);

                    // 2. Update message in Telegram to remove buttons and show result
                    if (message != null && messageId != null) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
                        long chatIdLong = (chat != null && chat.containsKey("id"))
                                ? ((Number) chat.get("id")).longValue()
                                : (fromId != null ? fromId.longValue() : Long.parseLong(adminChatId));
                        
                        String suffix = "\n\n✅ <b>TASDIQLANDI</b> ✅\n<i>Paket faollashtirildi!</i>";
                        if (message.containsKey("caption")) {
                            String caption = (String) message.get("caption");
                            telegramBotService.editMessageCaption(chatIdLong, messageId, caption + suffix);
                        } else if (message.containsKey("text")) {
                            String text = (String) message.get("text");
                            telegramBotService.editMessageText(chatIdLong, messageId, text + suffix);
                        }
                    }

                } catch (Exception e) {
                    log.error("❌ approveRequest failed: {}", e.getMessage(), e);
                    // Update Telegram message to show error
                    if (message != null && messageId != null) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
                        long chatIdLong = (chat != null && chat.containsKey("id"))
                                ? ((Number) chat.get("id")).longValue()
                                : (fromId != null ? fromId.longValue() : Long.parseLong(adminChatId));
                        
                        String errorSuffix = "\n\n❌ <b>XATOLIK:</b>\n<code>" + e.getMessage() + "</code>";
                        if (message.containsKey("caption")) {
                            String caption = (String) message.get("caption");
                            telegramBotService.editMessageCaption(chatIdLong, messageId, caption + errorSuffix);
                        } else if (message.containsKey("text")) {
                            String text = (String) message.get("text");
                            telegramBotService.editMessageText(chatIdLong, messageId, text + errorSuffix);
                        }
                    }
                }

            // ─── REJECT ─────────────────────────────────────────────────────
            } else if (data.startsWith("reject_sub:")) {
                String reqIdStr = data.substring("reject_sub:".length()).trim();
                log.info("🔴 REJECT request: {}", reqIdStr);

                // 1. Immediately acknowledge Telegram button press
                telegramBotService.answerCallbackQuery(queryId, "⏳ Rad etilmoqda...", false);

                try {
                    UUID requestId = UUID.fromString(reqIdStr);
                    subscriptionRequestService.rejectRequest(requestId, "Telegram Bot (Admin)");
                    log.info("❌ Subscription rejected: {}", requestId);

                    // 2. Update message in Telegram to remove buttons and show result
                    if (message != null && messageId != null) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
                        long chatIdLong = (chat != null && chat.containsKey("id"))
                                ? ((Number) chat.get("id")).longValue()
                                : (fromId != null ? fromId.longValue() : Long.parseLong(adminChatId));
                        
                        String suffix = "\n\n❌ <b>RAD ETILDI</b> ❌\n<i>So'rov bekor qilindi.</i>";
                        if (message.containsKey("caption")) {
                            String caption = (String) message.get("caption");
                            telegramBotService.editMessageCaption(chatIdLong, messageId, caption + suffix);
                        } else if (message.containsKey("text")) {
                            String text = (String) message.get("text");
                            telegramBotService.editMessageText(chatIdLong, messageId, text + suffix);
                        }
                    }

                } catch (Exception e) {
                    log.error("❌ rejectRequest failed: {}", e.getMessage(), e);
                    // Update Telegram message to show error
                    if (message != null && messageId != null) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
                        long chatIdLong = (chat != null && chat.containsKey("id"))
                                ? ((Number) chat.get("id")).longValue()
                                : (fromId != null ? fromId.longValue() : Long.parseLong(adminChatId));
                        
                        String errorSuffix = "\n\n❌ <b>XATOLIK:</b>\n<code>" + e.getMessage() + "</code>";
                        if (message.containsKey("caption")) {
                            String caption = (String) message.get("caption");
                            telegramBotService.editMessageCaption(chatIdLong, messageId, caption + errorSuffix);
                        } else if (message.containsKey("text")) {
                            String text = (String) message.get("text");
                            telegramBotService.editMessageText(chatIdLong, messageId, text + errorSuffix);
                        }
                    }
                }

            } else {
                // Forward to dispatcher
                telegramBotDispatcher.dispatch(update);
            }

        } catch (Exception e) {
            log.error("🔥 Critical error in webhook handler: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok().build();
    }
}
