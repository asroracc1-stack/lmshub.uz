package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(UUID userId);

    /** Auto-cleanup: delete all READ notifications older than a given cutoff for a user */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId AND n.isRead = true AND n.createdAt < :cutoff")
    int deleteReadNotificationsOlderThan(@Param("userId") UUID userId, @Param("cutoff") LocalDateTime cutoff);

    /** Bulk delete all notifications for a user (used by clearAll) */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);
}

