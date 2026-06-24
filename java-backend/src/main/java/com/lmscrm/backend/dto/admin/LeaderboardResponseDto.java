package com.lmscrm.backend.dto.admin;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardResponseDto {
    private List<LeaderboardDto> users;
    private CurrentUserStats currentUserStats;
    private int totalPages;
    private long totalElements;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CurrentUserStats {
        private Integer rank;
        private Long coins;
        private Long usersAbove;
        private Long usersBelow;
    }
}
