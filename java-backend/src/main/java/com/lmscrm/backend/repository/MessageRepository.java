package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Message;
import com.lmscrm.backend.domain.enums.MessageType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("SELECT m FROM Message m WHERE m.receiver.id = :userId OR m.sender.id = :userId OR m.type = 'BROADCAST' ORDER BY m.sentAt DESC")
    List<Message> findMessagesForUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiver.id = :userId OR m.sender.id = :userId OR m.type = 'BROADCAST'")
    long countMessagesForUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender.id = :userId")
    long countSentMessagesByUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.type = 'BROADCAST'")
    long countBroadcastMessages();
}
