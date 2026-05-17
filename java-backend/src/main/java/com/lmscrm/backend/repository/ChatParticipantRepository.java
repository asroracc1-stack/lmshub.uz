package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.ChatParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, UUID> {
    List<ChatParticipant> findByThreadId(UUID threadId);
    Optional<ChatParticipant> findByThreadIdAndUserId(UUID threadId, UUID userId);
    boolean existsByThreadIdAndUserId(UUID threadId, UUID userId);
}
