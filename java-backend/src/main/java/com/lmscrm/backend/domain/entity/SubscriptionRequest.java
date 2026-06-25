package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscription_transactions", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pack_id", nullable = false)
    private SubscriptionPack pack;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime requestedAt;

    private LocalDateTime processedAt;

    @Column(nullable = false)
    private String status; // PENDING, APPROVED, REJECTED

    private String processedBy; // Admin username

    @Column(name = "receipt_url")
    private String receiptUrl;

    @Column(name = "rejection_reason")
    private String rejectionReason;
}
