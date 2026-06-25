package com.lmscrm.backend.dto.admin;

import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuperAdminStatsDto {
    private Stats stats;
    private List<MonthPoint> growth;
    private List<OrgPoint> topOrgs;
    private List<AuditLogItem> recentActivity;

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
        private java.math.BigDecimal totalRevenue;
        private long activeSubscriptions;
        private long pendingRequests;
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
