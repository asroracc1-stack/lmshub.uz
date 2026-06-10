package com.lmscrm.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentIeltsDashboardDto {
    // Banner Stats
    private Double targetBand;
    private Double currentBand;
    private Integer progressPercentage;
    
    // Streaks
    private Integer dailyStreak;
    private Integer longestStreak;
    private List<Boolean> weekChecklist; // Mon to Sun
    
    // Metric Cards
    private String targetBandTrend;
    private String averageScoreTrend;
    private Integer daysUntilExam;
    private String totalPracticeTime;
    
    // Weekly Chart Data
    private List<ChartPointDto> weeklyResults;
    
    // Goals & Achievements
    private List<GoalDto> todayGoals;
    private List<AchievementDto> achievements;
    
    // Leaderboard & History
    private List<LeaderboardDto> leaderboard;
    private List<RecentTestDto> recentTests;
    
    // Account Info
    private Boolean isPremium;
    private Integer takenTestsCount;
    private Integer overallProgress;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartPointDto {
        private String day;
        private Double reading;
        private Double listening;
        private Double writing;
        private Double speaking;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalDto {
        private String id;
        private String title;
        private String subtitle;
        private String type; // "test", "practice", "vocabulary", "writing", "listening"
        private Integer progress; // 0-100 percentage or null if boolean
        private Boolean isCompleted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AchievementDto {
        private String id;
        private String title;
        private String description;
        private String date;
        private String iconType; // e.g. "streak", "star", "top10"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderboardDto {
        private Integer rank;
        private String name;
        private String avatarUrl;
        private Double bandScore;
        private Boolean isCurrentUser;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentTestDto {
        private String id;
        private String title;
        private String subtitle;
        private String type; // "full", "reading", "listening", "speaking"
        private Double score;
        private String date;
    }
}
