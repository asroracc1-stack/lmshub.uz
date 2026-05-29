package com.lmscrm.backend.entity;
// Move this file to src/main/java/com/lmscrm/backend/entity/User.java

import com.lmscrm.backend.domain.enums.AppRole;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String username;
    private String fullName;
    private String email;

    @Enumerated(EnumType.STRING)
    private AppRole role;

    private UUID organizationId;

    private LocalDateTime createdAt;
}