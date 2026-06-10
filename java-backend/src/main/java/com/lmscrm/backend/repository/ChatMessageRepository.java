package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByThreadIdOrderByCreatedAtAsc(UUID threadId);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM ChatMessage m WHERE m.thread.id = :threadId AND m.isDeleted = false AND (m.deletedForUsers IS NULL OR m.deletedForUsers NOT LIKE CONCAT('%', :userIdStr, '%')) ORDER BY m.createdAt DESC")
    List<ChatMessage> findLatestMessages(@org.springframework.data.repository.query.Param("threadId") UUID threadId, @org.springframework.data.repository.query.Param("userIdStr") String userIdStr, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM ChatMessage m WHERE m.thread.id = :threadId AND m.createdAt < :cursor AND m.isDeleted = false AND (m.deletedForUsers IS NULL OR m.deletedForUsers NOT LIKE CONCAT('%', :userIdStr, '%')) ORDER BY m.createdAt DESC")
    List<ChatMessage> findMessagesBeforeCursor(@org.springframework.data.repository.query.Param("threadId") UUID threadId, @org.springframework.data.repository.query.Param("cursor") java.time.LocalDateTime cursor, @org.springframework.data.repository.query.Param("userIdStr") String userIdStr, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM ChatMessage m WHERE m.thread.id IN (SELECT p.thread.id FROM ChatParticipant p WHERE p.user.id = :userId) AND LOWER(m.body) LIKE LOWER(CONCAT('%', :query, '%')) AND m.isDeleted = false AND (m.deletedForUsers IS NULL OR m.deletedForUsers NOT LIKE CONCAT('%', :userIdStr, '%')) ORDER BY m.createdAt DESC")
    List<ChatMessage> searchMessages(@org.springframework.data.repository.query.Param("userId") UUID userId, @org.springframework.data.repository.query.Param("userIdStr") String userIdStr, @org.springframework.data.repository.query.Param("query") String query, org.springframework.data.domain.Pageable pageable);
}
