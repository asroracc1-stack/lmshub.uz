package com.lmscrm.backend.listener;

import com.lmscrm.backend.event.StudentNotificationEvent;
import com.lmscrm.backend.service.TelegramBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StudentNotificationListener {

    private final TelegramBotService telegramBotService;

    @Async
    @EventListener
    public void handleStudentNotification(StudentNotificationEvent event) {
        log.info("Handling student notification for parent: {}", event.getParentTelegramUsername());
        
        // In a real scenario, we might need to resolve telegramUsername to chat_id first 
        // if the bot doesn't support username-based messaging directly.
        // For now, we use the foundation method.
        String target = event.getParentTelegramUsername();
        if (!target.startsWith("@") && !target.matches("\\d+")) {
            target = "@" + target;
        }
        
        telegramBotService.sendMessageTo(target, event.getMessage());
    }
}
