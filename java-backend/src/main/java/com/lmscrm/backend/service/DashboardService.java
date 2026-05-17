package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.CalendarEvent;
import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.response.DashboardStatsResponse;
import com.lmscrm.backend.repository.CalendarEventRepository;
import com.lmscrm.backend.repository.OrganizationRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final CalendarEventRepository eventRepository;
    private final com.lmscrm.backend.repository.GroupRepository groupRepository;

    public DashboardStatsResponse getStats(User currentUser) {
        try {
            boolean isSuperAdmin = currentUser.getRole() == AppRole.SUPER_ADMIN;
            UUID orgId = currentUser.getOrganizationId();
            
            LocalDateTime lastMonth = LocalDateTime.now().minusMonths(1);
            
            long teachers = 0, students = 0, superAdmins = 0, orgAdmins = 0, parents = 0, events = 0, groups = 0;
            double tGrowth = 0, sGrowth = 0, saGrowth = 0, oaGrowth = 0, eGrowth = 0;
            Organization org = null;

            if (isSuperAdmin) {
                // Global stats for Super Admin
                teachers = userRepository.countByRole(AppRole.TEACHER);
                students = userRepository.countByRole(AppRole.STUDENT);
                superAdmins = userRepository.countByRole(AppRole.ADMIN);
                orgAdmins = userRepository.countByRole(AppRole.ADMINISTRATOR);
                parents = userRepository.countByRole(AppRole.PARENT);
                events = eventRepository.count();
                groups = groupRepository.count();
                
                tGrowth = calculateGrowth(teachers, userRepository.countByRoleAndCreatedAtBefore(AppRole.TEACHER, lastMonth));
                sGrowth = calculateGrowth(students, userRepository.countByRoleAndCreatedAtBefore(AppRole.STUDENT, lastMonth));
                saGrowth = calculateGrowth(superAdmins, userRepository.countByRoleAndCreatedAtBefore(AppRole.ADMIN, lastMonth));
                oaGrowth = calculateGrowth(orgAdmins, userRepository.countByRoleAndCreatedAtBefore(AppRole.ADMINISTRATOR, lastMonth));
                eGrowth = 0.0; // events countBefore not in repo for global yet, but can be added if needed
                
                org = Organization.builder().name("Barcha Tashkilotlar").build();
            } else if (orgId != null) {
                // Organization specific stats
                org = organizationRepository.findById(orgId).orElse(null);
                
                teachers = userRepository.countByRoleAndOrganizationId(AppRole.TEACHER, orgId);
                students = userRepository.countByRoleAndOrganizationId(AppRole.STUDENT, orgId);
                superAdmins = userRepository.countByRoleAndOrganizationId(AppRole.ADMIN, orgId);
                orgAdmins = userRepository.countByRoleAndOrganizationId(AppRole.ADMINISTRATOR, orgId);
                parents = userRepository.countByRoleAndOrganizationId(AppRole.PARENT, orgId);
                events = eventRepository.countByOrganizationId(orgId);
                groups = groupRepository.countByOrganizationId(orgId);
                
                tGrowth = calculateGrowth(teachers, userRepository.countByRoleAndOrganizationIdAndCreatedAtBefore(AppRole.TEACHER, orgId, lastMonth));
                sGrowth = calculateGrowth(students, userRepository.countByRoleAndOrganizationIdAndCreatedAtBefore(AppRole.STUDENT, orgId, lastMonth));
                saGrowth = calculateGrowth(superAdmins, userRepository.countByRoleAndOrganizationIdAndCreatedAtBefore(AppRole.ADMIN, orgId, lastMonth));
                oaGrowth = calculateGrowth(orgAdmins, userRepository.countByRoleAndOrganizationIdAndCreatedAtBefore(AppRole.ADMINISTRATOR, orgId, lastMonth));
                eGrowth = calculateGrowth(events, eventRepository.countByOrganizationIdAndCreatedAtBefore(orgId, lastMonth));
            } else {
                return DashboardStatsResponse.builder()
                        .organization(Organization.builder().name("Noma'lum").build())
                        .build();
            }

            return DashboardStatsResponse.builder()
                    .teachersCount(teachers)
                    .studentsCount(students)
                    .superAdminsCount(superAdmins)
                    .orgAdminsCount(orgAdmins)
                    .parentsCount(parents)
                    .eventsCount(events)
                    .groupsCount(groups)
                    .teacherGrowth(tGrowth)
                    .studentGrowth(sGrowth)
                    .superAdminGrowth(saGrowth)
                    .orgAdminGrowth(oaGrowth)
                    .eventGrowth(eGrowth)
                    .organization(org)
                    .subscriptionStatus("ACTIVE")
                    .build();
        } catch (Exception e) {
            log.error("Error generating dashboard stats", e);
            return DashboardStatsResponse.builder().build();
        }
    }

    private double calculateGrowth(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return ((double) (current - previous) / previous) * 100.0;
    }

    public List<CalendarEvent> getUpcomingEvents(User currentUser) {
        UUID orgId = currentUser.getOrganizationId();
        if (orgId == null) return List.of();
        return eventRepository.findByOrganizationIdAndStartsAtAfterOrderByStartsAtAsc(orgId, LocalDateTime.now());
    }
}
