package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, UUID> {
    List<Subject> findByOrganizationId(UUID organizationId);
    long countByOrganizationId(UUID organizationId);
}
