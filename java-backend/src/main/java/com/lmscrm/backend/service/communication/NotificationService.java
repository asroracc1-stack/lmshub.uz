package com.lmscrm.backend.service.communication;

import com.lmscrm.backend.domain.entity.Notification;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.dto.communication.NotificationDto;
import com.lmscrm.backend.mapper.CommunicationMapper;
import com.lmscrm.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CommunicationMapper mapper;

    @Transactional
    public void createNotification(User user, String title, String message, NotificationType type) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getMyNotifications(UUID userId, boolean unreadOnly) {
        List<Notification> notifications = unreadOnly ?
                notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId) :
                notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return notifications.stream()
                .map(mapper::toNotificationDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId)
                .filter(n -> n.getUser().getId().equals(userId))
                .ifPresent(n -> {
                    n.setIsRead(true);
                    n.setIsRead(true);
                    notificationRepository.save(n);
                });
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void deleteNotification(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId)
                .filter(n -> n.getUser().getId().equals(userId))
                .ifPresent(notificationRepository::delete);
    }

    @Transactional
    public void deleteAllNotifications(UUID userId) {
        List<Notification> all = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notificationRepository.deleteAll(all);
    }
}
