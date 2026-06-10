package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.ChatThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatThreadRepository extends JpaRepository<ChatThread, UUID> {

    @Query("SELECT t FROM ChatThread t JOIN ChatParticipant p ON p.thread.id = t.id WHERE p.user.id = :userId")
    List<ChatThread> findThreadsByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @Query("SELECT t FROM ChatThread t " +
            "JOIN ChatParticipant p1 ON p1.thread.id = t.id " +
            "JOIN ChatParticipant p2 ON p2.thread.id = t.id " +
            "WHERE t.isGroup = false " +
            "AND p1.user.id = :userId1 " +
            "AND p2.user.id = :userId2")
    java.util.Optional<ChatThread> findDirectThread(
            @org.springframework.data.repository.query.Param("userId1") UUID userId1, 
            @org.springframework.data.repository.query.Param("userId2") UUID userId2);
}
