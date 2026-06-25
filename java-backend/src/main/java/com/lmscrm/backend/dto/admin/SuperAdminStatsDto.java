package com.lmscrm.backend.dto.admin;

import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuperAdminStatsDto {
    private Stats stats;
    private List<MonthPoint> growth;
    private List<OrgPoint> topOrgs;
    private List<AuditLogItem> recentActivity;
    private SubscriptionStats subscriptionStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Stats {
        private long organizations;
        private long totalUsers;
        private long teachers;
        private long students;
        private long admins;
        private long administrators;
        private long users;
        private long parents;
        private long groups;
        private long totalSubjects;
        private BigDecimal totalRevenue;
        private long activeSubscriptions;
        private long pendingRequests;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionStats {
        private BigDecimal todaySales;
        private BigDecimal monthlySales;
        private long activeSubscriptions;
        private long pendingChecks;
        private long expiredSubscriptions;
        private String bestSellingPackage;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MonthPoint {
        private String month;
        private int users;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrgPoint {
        private String name;
        private long users;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditLogItem {
        private String id;
        private String action;
        private String actor;
        private String at;
    }
}
