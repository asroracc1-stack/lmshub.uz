package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.TenantAttendanceRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantAttendanceRuleRepository extends JpaRepository<TenantAttendanceRule, UUID> {
    Optional<TenantAttendanceRule> findByOrganizationId(UUID organizationId);
}
