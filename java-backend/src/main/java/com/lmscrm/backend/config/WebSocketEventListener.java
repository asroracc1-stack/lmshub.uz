package com.lmscrm.backend.config;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        if (event.getUser() instanceof UsernamePasswordAuthenticationToken) {
            String username = event.getUser().getName();
            userRepository.findByEmail(username).ifPresent(user -> {
                user.setLastActive(LocalDateTime.now());
                userRepository.save(user);
                
                // Broadcast online status to anyone who might care (could be a general topic)
                messagingTemplate.convertAndSend("/topic/presence", new UserPresenceEvent(user.getId(), true, null));
            });
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        if (event.getUser() instanceof UsernamePasswordAuthenticationToken) {
            String username = event.getUser().getName();
            userRepository.findByEmail(username).ifPresent(user -> {
                LocalDateTime now = LocalDateTime.now();
                user.setLastActive(now);
                userRepository.save(user);
                
                // Broadcast offline status
                messagingTemplate.convertAndSend("/topic/presence", new UserPresenceEvent(user.getId(), false, now));
            });
        }
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class UserPresenceEvent {
        private java.util.UUID userId;
        private boolean online;
        private LocalDateTime lastSeen;
    }
}
