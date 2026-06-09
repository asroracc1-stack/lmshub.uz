package com.lmscrm.backend.domain.entity;

import com.lmscrm.backend.bot.enums.BotState;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bot_user_states")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BotUserState {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "telegram_chat_id", unique = true, nullable = false)
    private String telegramChatId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BotState state;

    @Column(name = "last_interaction")
    private LocalDateTime lastInteraction;

    @Column(name = "selected_pack_id")
    private String selectedPackId;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        lastInteraction = LocalDateTime.now();
    }
}
