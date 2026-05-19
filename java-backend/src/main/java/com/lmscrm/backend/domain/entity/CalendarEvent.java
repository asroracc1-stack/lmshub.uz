package com.lmscrm.backend.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "calendar_events", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    @NotBlank(message = "Sarlavha bo'sh bo'lmasligi kerak")
    private String title;

    private String description;

    private String location;

    @Column(name = "starts_at", nullable = false)
    @NotNull(message = "Boshlanish vaqti bo'sh bo'lmasligi kerak")
    private LocalDateTime startsAt;

    @Column(name = "ends_at", nullable = false)
    @NotNull(message = "Tugash vaqti bo'sh bo'lmasligi kerak")
    private LocalDateTime endsAt;

    @Column(name = "is_all_day")
    @Builder.Default
    private Boolean isAllDay = false;

    private String type; // e.g., 'meeting', 'exam', 'holiday'

    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
