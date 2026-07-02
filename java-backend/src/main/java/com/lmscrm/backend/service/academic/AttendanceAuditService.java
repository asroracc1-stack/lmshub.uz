package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.AttendanceAuditLog;
import com.lmscrm.backend.domain.entity.AttendanceRecord;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceMethod;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.repository.AttendanceAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceAuditService {

    private final AttendanceAuditLogRepository auditRepo;

    /**
     * Create and persist a new attendance audit log entry.
     */
    @Transactional
    public void logChange(AttendanceRecord record, User changedBy,
                          AttendanceStatus oldStatus, AttendanceStatus newStatus,
                          AttendanceMethod oldMethod, AttendanceMethod newMethod,
                          String reason, String ipAddress, String userAgent, String metadata) {
        try {
            AttendanceAuditLog logEntry = AttendanceAuditLog.builder()
                    .attendanceRecord(record)
                    .changedBy(changedBy)
                    .organization(record.getOrganization())
                    .oldStatus(oldStatus)
                    .newStatus(newStatus)
                    .oldMethod(oldMethod)
                    .newMethod(newMethod)
                    .changeReason(reason)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .metadata(metadata)
                    .build();

            auditRepo.save(logEntry);
            log.info("Attendance change audited successfully: recordId={}, oldStatus={}, newStatus={}",
                    record.getId(), oldStatus, newStatus);
        } catch (Exception e) {
            log.error("Failed to log attendance audit record: {}", record.getId(), e);
        }
    }
}
