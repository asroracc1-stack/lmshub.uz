package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Group;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {
    List<Group> findByOrganizationId(UUID organizationId);
    Page<Group> findByOrganizationId(UUID organizationId, Pageable pageable);
    List<Group> findByTeacherId(UUID teacherId);
    long countByOrganizationId(UUID organizationId);
}
