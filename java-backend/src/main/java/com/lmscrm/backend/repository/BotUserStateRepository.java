package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.BotUserState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BotUserStateRepository extends JpaRepository<BotUserState, UUID> {
    Optional<BotUserState> findByTelegramChatId(String telegramChatId);
}
