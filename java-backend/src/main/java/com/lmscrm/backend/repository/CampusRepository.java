package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Campus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CampusRepository extends JpaRepository<Campus, UUID> {
    List<Campus> findByOrganizationId(UUID organizationId);
    List<Campus> findByOrganizationIdAndIsActiveTrue(UUID organizationId);
}
