package com.lmscrm.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
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

    @Value("${app.site.url:https://lmshub.uz}")
    private String siteUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getDefaultChatId() {
        return chatId;
    }

    public void sendMessage(String text) {
        sendMessageTo(chatId, text);
    }

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
     * @param localFilePath Full path to the image file on disk (e.g. "uploads/abc.jpg")
     */
    public void sendPhotoWithButton(String targetChatId, String caption, String localFilePath) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot not configured. Photo not sent.");
            return;
        }

        File imageFile = new File(localFilePath);
        if (!imageFile.exists()) {
            log.warn("Receipt file not found at: {}. Falling back to text message.", localFilePath);
            sendMessageTo(targetChatId, caption);
            return;
        }

        try {
            // Build inline keyboard JSON with "Saytga kirish" button
            String inlineKeyboard = String.format(
                    "{\"inline_keyboard\":[[{\"text\":\"🌐 Saytga kirish\",\"url\":\"%s\"}]]}",
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
            body.add("photo", new FileSystemResource(imageFile));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Photo with button sent to {} successfully", targetChatId);
            } else {
                log.warn("sendPhoto returned non-2xx: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send photo to {}: {}. Falling back to text.", targetChatId, e.getMessage());
            sendMessageTo(targetChatId, caption);
        }
    }

    /**
     * Sends text message with an inline "Saytga kirish" button.
     */
    public void sendMessageWithButton(String targetChatId, String text) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot not configured. Message not sent.");
            return;
        }
        try {
            String inlineKeyboard = String.format(
                    "{\"inline_keyboard\":[[{\"text\":\"🌐 Saytga kirish\",\"url\":\"%s\"}]]}",
                    siteUrl
            );

            String apiUrl = String.format("https://api.telegram.org/bot%s/sendMessage", botToken);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String jsonBody = String.format(
                    "{\"chat_id\":\"%s\",\"text\":%s,\"parse_mode\":\"HTML\",\"reply_markup\":%s}",
                    targetChatId,
                    com.fasterxml.jackson.databind.ObjectMapper.class.getDeclaredConstructor().newInstance()
                            .writeValueAsString(text),
                    inlineKeyboard
            );

            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            restTemplate.postForEntity(apiUrl, entity, String.class);
            log.info("Message with button sent to {}", targetChatId);
        } catch (Exception e) {
            log.error("Failed to send message with button to {}: {}", targetChatId, e.getMessage());
            sendMessageTo(targetChatId, text);
        }
    }
}
