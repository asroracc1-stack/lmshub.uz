package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, UUID> {
    List<UserSubscription> findByUserId(UUID userId);
    Optional<UserSubscription> findFirstByUserIdAndIsActiveTrueOrderByExpiresAtDesc(UUID userId);
    long countByIsActiveTrue();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(us) FROM UserSubscription us WHERE us.isActive = true AND us.user.organizationId = :orgId")
    long countActiveByOrganizationId(@org.springframework.data.repository.query.Param("orgId") UUID orgId);
}
