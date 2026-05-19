package com.lmscrm.backend.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.lmscrm.backend.domain.enums.AppRole;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

@Entity
@Table(name = "users", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false) // Username now unique and non-nullable
    private String username; // Changed to be the primary identifier for login

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(unique = true) // Email can be null for parents, but if present, it must be unique
    private String email;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "group_id")
    private UUID groupId;

    private String subject;

    @Column(name = "telegram_chat_id")
    private String telegramChatId;

    @Column(name = "telegram_username")
    private String telegramUsername;

    @Column(name = "parent_telegram_username")
    private String parentTelegramUsername;

    // Removed studentId as ParentStudentLink will handle the relationship

    @Column(name = "card_number")
    private String cardNumber;

    @Column(name = "card_holder")
    private String cardHolder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppRole role;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_google_user", columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean isGoogleUser = false;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(nullable = false)
    @Builder.Default
    private Long coins = 0L;

    @Column(name = "target_band")
    private Double targetBand;

    @Column(name = "exam_date")
    private java.time.LocalDate examDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonManagedReference
    private Profile profile;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return username; // Now returns the dedicated username field
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}