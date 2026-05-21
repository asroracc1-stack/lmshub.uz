package com.lmscrm.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class TelegramBotService {

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.chat-id}")
    private String chatId;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendMessage(String text) {
        sendMessageTo(chatId, text);
    }

    public void sendMessageTo(String targetChatId, String text) {
        if (botToken == null || botToken.equals("your_bot_token") || targetChatId == null || targetChatId.isBlank()) {
            log.warn("Telegram bot token or target chat ID is not configured. Message not sent: {}", text);
            return;
        }

        try {
            String encodedText = java.net.URLEncoder.encode(text, java.nio.charset.StandardCharsets.UTF_8.toString());
            String url = String.format("https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s&parse_mode=HTML", 
                                        botToken, targetChatId, encodedText);
            restTemplate.getForObject(url, String.class);
            log.info("Telegram message sent successfully to {}", targetChatId);
        } catch (Exception e) {
            log.error("Failed to send telegram message to {}: {}", targetChatId, e.getMessage());
        }
    }
}
