package com.lmscrm.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.net.URI;

@Service
@Slf4j
public class TelegramBotService {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.chat-id}")
    private String chatId;

    @Value("${app.site.url:https://www.lmshub.uz}")
    private String siteUrl;

    @Value("${app.backend.url:https://lmshubuz-production.up.railway.app}")
    private String backendUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getDefaultChatId() {
        return chatId;
    }

    @Async
    public void sendMessage(String text) {
        sendMessageTo(chatId, text);
    }

    @Async
    public void sendMessageTo(String targetChatId, String text) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot token or target chat ID is not configured. Message not sent.");
            return;
        }
        try {
            String encodedText = java.net.URLEncoder.encode(text, java.nio.charset.StandardCharsets.UTF_8.toString());
            String urlStr = String.format("https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s&parse_mode=HTML",
                    botToken, targetChatId, encodedText);
            restTemplate.getForObject(new URI(urlStr), String.class);
            log.info("Telegram message sent successfully to {}", targetChatId);
        } catch (Exception e) {
            log.error("Failed to send telegram message to {}: {}", targetChatId, e.getMessage());
        }
    }

    /**
     * Sends a photo file to Telegram with a caption and an inline "Saytga kirish" button.
     * Falls back to text message if photo file not found.
     *
     * @param targetChatId  Telegram chat ID
     * @param caption       Caption shown under the photo
     * @param photo         Full path to the image file, URL, file ID or Resource
     */
    @Async
    public void sendPhotoWithButton(String targetChatId, String caption, Object photo) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot not configured. Photo not sent.");
            return;
        }

        try {
            // Build inline keyboard
            String inlineKeyboard = String.format(
                    "{\"inline_keyboard\":[[{\"text\":\"🌐 Saytga o'tish\",\"url\":\"%s\"}]]}",
                    siteUrl
            );

            String apiUrl = String.format("https://api.telegram.org/bot%s/sendPhoto", botToken);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("chat_id", targetChatId);
            body.add("caption", caption);
            body.add("parse_mode", "HTML");
            body.add("reply_markup", inlineKeyboard);

            if (photo instanceof org.springframework.core.io.Resource) {
                body.add("photo", photo);
            } else if (photo instanceof String) {
                String photoStr = (String) photo;
                if (photoStr.startsWith("http")) {
                    body.add("photo", photoStr);
                } else if (!photoStr.contains("/") && !photoStr.contains("\\") && !photoStr.contains(".")) {
                    body.add("photo", photoStr); // Telegram fileId
                } else {
                    File imageFile = new File(photoStr);
                    if (!imageFile.exists()) {
                        log.warn("Receipt file not found at: {}. Falling back to text message.", photoStr);
                        sendMessageWithButton(targetChatId, caption);
                        return;
                    }
                    body.add("photo", new FileSystemResource(imageFile));
                }
            } else {
                sendMessageWithButton(targetChatId, caption);
                return;
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Photo sent to {} successfully", targetChatId);
            } else {
                log.warn("sendPhoto returned non-2xx: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send photo to {}: {}. Falling back to text.", targetChatId, e.getMessage());
            sendMessageWithButton(targetChatId, caption);
        }
    }

    /**
     * Sends text message with an inline "Saytga kirish" button.
     */
    @Async
    public void sendMessageWithButton(String targetChatId, String text) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot not configured. Message not sent.");
            return;
        }
        try {
            String apiUrl = String.format("https://api.telegram.org/bot%s/sendMessage", botToken);

            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("chat_id", targetChatId);
            body.put("text", text);
            body.put("parse_mode", "HTML");

            java.util.Map<String, Object> button = new java.util.HashMap<>();
            button.put("text", "🌐 Saytga o'tish");
            button.put("url", siteUrl);

            java.util.List<java.util.Map<String, Object>> row = new java.util.ArrayList<>();
            row.add(button);
            java.util.List<java.util.List<java.util.Map<String, Object>>> keyboard = new java.util.ArrayList<>();
            keyboard.add(row);

            java.util.Map<String, Object> replyMarkup = new java.util.HashMap<>();
            replyMarkup.put("inline_keyboard", keyboard);
            body.put("reply_markup", replyMarkup);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<java.util.Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Message with button sent to {} successfully", targetChatId);
            } else {
                log.warn("sendMessage returned non-2xx: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send message with button to {}: {}", targetChatId, e.getMessage());
            sendMessageTo(targetChatId, text);
        }
    }

    public String getSiteUrl() {
        return siteUrl;
    }

    @jakarta.annotation.PostConstruct
    public void registerWebhook() {
        if (botToken == null || botToken.equals("your_bot_token") || botToken.isBlank()) {
            log.warn("Telegram bot token not configured. Webhook not registered.");
            return;
        }
        try {
            String webhookUrl = backendUrl + "/api/v1/telegram/webhook";
            String apiUrl = String.format("https://api.telegram.org/bot%s/setWebhook?url=%s", botToken, webhookUrl);
            restTemplate.getForObject(new URI(apiUrl), String.class);
            log.info("Telegram Webhook registered successfully pointing to: {}", webhookUrl);
        } catch (Exception e) {
            log.error("Failed to register Telegram Webhook: {}", e.getMessage());
        }
    }

    @Async
    public void sendPhotoWithInlineButtons(String targetChatId, String caption, Object photo, String approveCallback, String rejectCallback) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot not configured. Photo not sent.");
            return;
        }

        try {
            // Build inline keyboard
            String inlineKeyboard = String.format(
                    "{\"inline_keyboard\":[[{\"text\":\"✅ Tasdiqlash\",\"callback_data\":\"%s\"},{\"text\":\"❌ Rad etish\",\"callback_data\":\"%s\"}]]}",
                    approveCallback, rejectCallback
            );

            String apiUrl = String.format("https://api.telegram.org/bot%s/sendPhoto", botToken);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("chat_id", targetChatId);
            body.add("caption", caption);
            body.add("parse_mode", "HTML");
            body.add("reply_markup", inlineKeyboard);

            if (photo instanceof org.springframework.core.io.Resource) {
                body.add("photo", photo);
            } else if (photo instanceof String) {
                String photoStr = (String) photo;
                if (photoStr.startsWith("http")) {
                    body.add("photo", photoStr);
                } else if (!photoStr.contains("/") && !photoStr.contains("\\") && !photoStr.contains(".")) {
                    body.add("photo", photoStr); // Telegram fileId
                } else {
                    File imageFile = new File(photoStr);
                    if (!imageFile.exists()) {
                        log.warn("Photo file not found at: {}. Falling back to text message.", photoStr);
                        sendMessageWithInlineButtons(targetChatId, caption, approveCallback, rejectCallback);
                        return;
                    }
                    body.add("photo", new FileSystemResource(imageFile));
                }
            } else {
                sendMessageWithInlineButtons(targetChatId, caption, approveCallback, rejectCallback);
                return;
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Photo with inline buttons sent to {} successfully", targetChatId);
            } else {
                log.warn("sendPhoto returned non-2xx: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send photo to {}: {}. Falling back to text.", targetChatId, e.getMessage());
            sendMessageWithInlineButtons(targetChatId, caption, approveCallback, rejectCallback);
        }
    }

    @Async
    public void sendMessageWithInlineButtons(String targetChatId, String text, String approveCallback, String rejectCallback) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot not configured. Message not sent.");
            return;
        }
        try {
            String apiUrl = String.format("https://api.telegram.org/bot%s/sendMessage", botToken);

            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("chat_id", targetChatId);
            body.put("text", text);
            body.put("parse_mode", "HTML");

            java.util.Map<String, Object> approveBtn = new java.util.HashMap<>();
            approveBtn.put("text", "✅ Tasdiqlash");
            approveBtn.put("callback_data", approveCallback);

            java.util.Map<String, Object> rejectBtn = new java.util.HashMap<>();
            rejectBtn.put("text", "❌ Rad etish");
            rejectBtn.put("callback_data", rejectCallback);

            java.util.List<java.util.Map<String, Object>> row = new java.util.ArrayList<>();
            row.add(approveBtn);
            row.add(rejectBtn);

            java.util.List<java.util.List<java.util.Map<String, Object>>> keyboard = new java.util.ArrayList<>();
            keyboard.add(row);

            java.util.Map<String, Object> replyMarkup = new java.util.HashMap<>();
            replyMarkup.put("inline_keyboard", keyboard);
            body.put("reply_markup", replyMarkup);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<java.util.Map<String, Object>> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(apiUrl, entity, String.class);
            log.info("Message with inline buttons sent to {}", targetChatId);
        } catch (Exception e) {
            log.error("Failed to send message with inline buttons to {}: {}", targetChatId, e.getMessage());
            sendMessageTo(targetChatId, text);
        }
    }

    public void answerCallbackQuery(String callbackQueryId, String text, boolean showAlert) {
        if (botToken == null || botToken.equals("your_bot_token")) return;
        try {
            String apiUrl = String.format("https://api.telegram.org/bot%s/answerCallbackQuery", botToken);
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("callback_query_id", callbackQueryId);
            body.put("text", text);
            body.put("show_alert", showAlert);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<java.util.Map<String, Object>> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(apiUrl, entity, String.class);
        } catch (Exception e) {
            log.error("Failed to answer callback query: {}", e.getMessage());
        }
    }

    public void editMessageCaption(Long chatId, Integer messageId, String newCaption) {
        if (botToken == null || botToken.equals("your_bot_token")) return;
        try {
            String apiUrl = String.format("https://api.telegram.org/bot%s/editMessageCaption", botToken);
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("chat_id", chatId);
            body.put("message_id", messageId);
            body.put("caption", newCaption);
            body.put("parse_mode", "HTML");

            // Empty inline keyboard (removes buttons)
            java.util.Map<String, Object> replyMarkup = new java.util.HashMap<>();
            replyMarkup.put("inline_keyboard", new java.util.ArrayList<>());
            body.put("reply_markup", replyMarkup);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<java.util.Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> resp = restTemplate.postForEntity(apiUrl, entity, String.class);
            log.info("editMessageCaption response: {}", resp.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to edit message caption: {}", e.getMessage());
        }
    }

    public void editMessageText(Long chatId, Integer messageId, String newText) {
        if (botToken == null || botToken.equals("your_bot_token")) return;
        try {
            String apiUrl = String.format("https://api.telegram.org/bot%s/editMessageText", botToken);
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("chat_id", chatId);
            body.put("message_id", messageId);
            body.put("text", newText);
            body.put("parse_mode", "HTML");

            // Empty inline keyboard (removes buttons)
            java.util.Map<String, Object> replyMarkup = new java.util.HashMap<>();
            replyMarkup.put("inline_keyboard", new java.util.ArrayList<>());
            body.put("reply_markup", replyMarkup);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<java.util.Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> resp = restTemplate.postForEntity(apiUrl, entity, String.class);
            log.info("editMessageText response: {}", resp.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to edit message text: {}", e.getMessage());
        }
    }
}
