package com.lmscrm.backend.dto.admin;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardDto {
    private UUID id;
    private String fullName;
    private String username;
    private String avatarUrl;
    private Long coins;
    private Integer rank;
    private Long xp;
    private Integer level;
    private Integer achievementCount;
    private Integer testsCompleted;
    private Integer streak;
    private String joinDate;
    private Double practiceMinutes;

}
