package com.lmscrm.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class AdminDashboardOverviewResponse {
    private OrganizationOverview organization;
    private List<EventOverview> upcomingEvents;
    private SubscriptionOverview subscription;

    @Data
    @Builder
    public static class OrganizationOverview {
        private String name;
        private String address;
        private String email;
        private String phone;
        private String logoUrl;
    }

    @Data
    @Builder
    public static class EventOverview {
        private String id;
        private String title;
        private String startsAt;
        private String endsAt;
        private String location;
    }

    @Data
    @Builder
    public static class SubscriptionOverview {
        private String planName;
        private String status; // ACTIVE, EXPIRING, EXPIRED
        private String expiresAt;
    }
}
