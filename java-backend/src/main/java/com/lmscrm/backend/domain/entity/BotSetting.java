package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "bot_settings", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BotSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String kind; // 'bot' or 'channel'

    @Column(unique = true)
    private String username;

    private String botToken;

    @Column(nullable = false)
    private String botName;

    private String welcomeMessage;

    private String deepLinkingPrefix;

    @Builder.Default
    private Boolean isActive = true;
}
