package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.PaymentTransaction;
import com.lmscrm.backend.domain.enums.PaymentTransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    List<PaymentTransaction> findByOrganizationId(UUID organizationId);

    Page<PaymentTransaction> findByOrganizationId(UUID organizationId, Pageable pageable);

    @Query("SELECT p FROM PaymentTransaction p WHERE p.organizationId = :orgId AND (:status IS NULL OR p.status = :status) ORDER BY p.createdAt DESC")
    Page<PaymentTransaction> findByOrganizationIdAndStatus(@Param("orgId") UUID orgId, @Param("status") PaymentTransactionStatus status, Pageable pageable);

    @Query("SELECT p FROM PaymentTransaction p WHERE (p.student.id = :userId OR p.payer.id = :userId) ORDER BY p.createdAt DESC")
    List<PaymentTransaction> findByStudentOrPayerId(@Param("userId") UUID userId);
}
