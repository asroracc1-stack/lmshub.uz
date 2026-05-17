package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.PaymentReceiver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import java.util.List;

@Repository
public interface PaymentReceiverRepository extends JpaRepository<PaymentReceiver, UUID> {
    
    @Query("SELECT p FROM PaymentReceiver p WHERE " +
           "(LOWER(p.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "p.cardNumber LIKE CONCAT('%', :query, '%'))")
    List<PaymentReceiver> searchAll(String query);

    @Query("SELECT p FROM PaymentReceiver p WHERE p.organization.id = :orgId")
    List<PaymentReceiver> findByOrganizationId(UUID orgId);

    List<PaymentReceiver> findByIsDefaultTrueAndOrganizationId(UUID orgId);
    List<PaymentReceiver> findByIsDefaultTrueAndOrganizationIsNull();
}
