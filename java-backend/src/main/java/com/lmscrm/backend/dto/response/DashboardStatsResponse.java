package com.lmscrm.backend.dto.response;

import com.lmscrm.backend.domain.entity.Organization;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsResponse {
    private long teachersCount;
    private long studentsCount;
    private long superAdminsCount;
    private long orgAdminsCount;
    private long parentsCount;
    private long eventsCount;
    private long groupsCount;
    
    private double teacherGrowth;
    private double studentGrowth;
    private double superAdminGrowth;
    private double orgAdminGrowth;
    private double eventGrowth;
    
    private Organization organization;
    private String subscriptionStatus; // ACTIVE, EXPIRING, EXPIRED
}
