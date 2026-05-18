package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    
    @Query("SELECT o FROM Organization o WHERE LOWER(o.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(o.slug) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Organization> searchOrganizations(String query, Pageable pageable);

    java.util.Optional<Organization> findBySlug(String slug);

    long countBySubscriptionPackageId(UUID planId);
}
