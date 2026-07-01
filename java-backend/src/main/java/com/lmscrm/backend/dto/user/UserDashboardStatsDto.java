package com.lmscrm.backend.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDashboardStatsDto {
    private Double totalMinutes;
    private Integer streak;
    private Double targetBand;
    private Double avgScore;
    private Long examDaysLeft;
    private List<DailyDataDto> weeklyData;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DailyDataDto {
        private String day;
        private Double minutes;
        private Double reading;
        private Double listening;
        private Double writing;
        private Double speaking;
        private Double sat;
        private Double nationalCert;
    }
}
