package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.AttendanceRecord;
import com.lmscrm.backend.domain.entity.TenantAttendanceRule;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.repository.TenantAttendanceRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicAttendanceRuleEngine {

    private final TenantAttendanceRuleRepository rulesRepo;

    /**
     * Evaluates the attendance status dynamically based on tenant organization rule metrics.
     */
    public AttendanceStatus evaluateStatus(AttendanceRecord record, double presenceScore) {
        TenantAttendanceRule rule = rulesRepo.findByOrganizationId(record.getOrganization().getId())
                .orElseGet(() -> TenantAttendanceRule.builder()
                        .organization(record.getOrganization())
                        .lateMinutesLimit(10)
                        .absentMinutesLimit(20)
                        .minScorePresent(new BigDecimal("0.60"))
                        .earlyLeaveLimit(15)
                        .build());

        // 1. Frequency validation check
        if (presenceScore < rule.getMinScorePresent().doubleValue()) {
            return AttendanceStatus.ABSENT;
        }

        // 2. Late Arrival validation
        if (record.getCheckInTime() != null) {
            long minutesLate = ChronoUnit.MINUTES.between(
                    record.getLesson().getStartsAt(),
                    record.getCheckInTime()
            );

            if (minutesLate >= rule.getAbsentMinutesLimit()) {
                return AttendanceStatus.ABSENT;
            } else if (minutesLate >= rule.getLateMinutesLimit()) {
                return AttendanceStatus.LATE;
            }
        }

        // 3. Early Leave validation
        if (record.getCheckOutTime() != null) {
            long minutesBeforeEnd = ChronoUnit.MINUTES.between(
                    record.getCheckOutTime(),
                    record.getLesson().getEndsAt()
            );

            if (minutesBeforeEnd >= rule.getEarlyLeaveLimit()) {
                return AttendanceStatus.LEFT_EARLY;
            }
        }

        return AttendanceStatus.PRESENT;
    }
}
