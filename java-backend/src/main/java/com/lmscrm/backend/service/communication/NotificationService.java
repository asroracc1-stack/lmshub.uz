package com.lmscrm.backend.service.communication;

import com.lmscrm.backend.domain.entity.Notification;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.dto.communication.NotificationDto;
import com.lmscrm.backend.mapper.CommunicationMapper;
import com.lmscrm.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CommunicationMapper mapper;

    /** How many days before a READ notification is auto-purged */
    private static final int AUTO_PURGE_DAYS = 7;

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

    /**
     * Returns the user's notifications.
     * Always auto-purges read notifications older than AUTO_PURGE_DAYS days first,
     * so stale "already-read" entries never re-appear.
     */
    @Transactional
    public List<NotificationDto> getMyNotifications(UUID userId, boolean unreadOnly) {
        // Auto-cleanup: remove read notifications older than 7 days
        LocalDateTime cutoff = LocalDateTime.now().minusDays(AUTO_PURGE_DAYS);
        int deleted = notificationRepository.deleteReadNotificationsOlderThan(userId, cutoff);
        if (deleted > 0) {
            log.debug("Auto-purged {} old read notifications for user {}", deleted, userId);
        }

        List<Notification> notifications = unreadOnly
                ? notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return notifications.stream()
                .map(mapper::toNotificationDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            // Verify ownership without lazy-loading the full User object
            if (n.getUser() != null && n.getUser().getId().equals(userId)) {
                n.setIsRead(true);
                notificationRepository.save(n);
                log.debug("Marked notification {} as read for user {}", notificationId, userId);
            }
        });
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
        log.debug("Marked {} notifications as read for user {}", unread.size(), userId);
    }

    @Transactional
    public void deleteNotification(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser() != null && n.getUser().getId().equals(userId)) {
                notificationRepository.delete(n);
                log.debug("Deleted notification {} for user {}", notificationId, userId);
            }
        });
    }

    /** Bulk-delete ALL notifications for a user (faster than loading + deleteAll) */
    @Transactional
    public void deleteAllNotifications(UUID userId) {
        int count = notificationRepository.deleteAllByUserId(userId);
        log.debug("Deleted {} notifications for user {}", count, userId);
    }
}
