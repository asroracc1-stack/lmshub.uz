package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thread_id", nullable = false)
    private ChatThread thread;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "message_type")
    private String messageType = "TEXT";

    @Column(name = "delivered")
    private Boolean delivered = false;

    @Column(name = "seen")
    private Boolean seen = false;

    @Column(name = "seen_at")
    private LocalDateTime seenAt;

    @Column(name = "file_url", length = 1024)
    private String fileUrl;

    @Column(name = "sticker_url", length = 1024)
    private String stickerUrl;

    @Column(name = "voice_url", length = 1024)
    private String voiceUrl;

    @Column(name = "duration")
    private Integer duration;

    @Column(name = "reply_to_id")
    private UUID replyToId;

    @Column(name = "forwarded_from_id")
    private UUID forwardedFromId;

    @Column(name = "is_pinned")
    private Boolean isPinned = false;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(name = "deleted_for_users")
    private String deletedForUsers;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
