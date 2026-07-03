package com.lmscrm.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardStatsDto {
    
    @JsonProperty("totalTeachers")
    private long totalTeachers;

    @JsonProperty("totalStudents")
    private long totalStudents;

    @JsonProperty("totalParents")
    private long totalParents;

    @JsonProperty("totalAdministrators")
    private long totalAdministrators;

    @JsonProperty("totalGroups")
    private long totalGroups;

    @JsonProperty("totalSubjects")
    private long totalSubjects;

    @JsonProperty("totalEvents")
    private long totalEvents;

    @JsonProperty("totalActiveSubscriptions")
    private long totalActiveSubscriptions;
}
