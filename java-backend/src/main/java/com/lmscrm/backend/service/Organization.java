package com.lmscrm.backend.entity;

import com.lmscrm.backend.domain.entity.Address;
import com.lmscrm.backend.domain.entity.SubscriptionPack;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "organizations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organization {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String name;
    private String email;
    private String phone;
    private String logoUrl;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "address_id")
    private
    Address address;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_pack_id")
    private SubscriptionPack subscriptionPackage;

    private LocalDateTime createdAt;
}