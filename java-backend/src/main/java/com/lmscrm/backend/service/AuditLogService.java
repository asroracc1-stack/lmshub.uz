package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.AuditLog;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(String action, String objectType, String objectId, User user, String details) {
        AuditLog log = AuditLog.builder()
                .action(action)
                .objectType(objectType)
                .objectId(objectId)
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : "SYSTEM")
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    public Page<AuditLog> getLogs(String query, Pageable pageable) {
        return auditLogRepository.filterLogs(query, pageable);
    }
}
