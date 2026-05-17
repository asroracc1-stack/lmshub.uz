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
    List<ChatThread> findThreadsByUserId(UUID userId);
}
