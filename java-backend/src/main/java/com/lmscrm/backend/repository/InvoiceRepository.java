package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    
    @Query("SELECT i FROM Invoice i WHERE " +
           "(:query IS NULL OR :query = '' OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(i.organization.name) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:status IS NULL OR :status = 'all' OR " +
           "(:status = 'PAID' AND i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PAID) OR " +
           "(:status = 'SENT' AND (i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING)) OR " +
           "(:status = 'OVERDUE' AND (i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.OVERDUE OR ((i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING) AND i.dueDate < CURRENT_DATE))))")
    Page<Invoice> filterInvoices(String query, String status, Pageable pageable);

    @Query("SELECT i FROM Invoice i WHERE LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Invoice> searchInvoices(String query, Pageable pageable);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.organization.id = :orgId AND i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT")
    java.math.BigDecimal sumPendingPaymentsByOrganizationId(UUID orgId);

    java.util.List<Invoice> findByStudentId(UUID studentId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PAID")
    java.math.BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE (i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT) AND i.dueDate >= CURRENT_DATE")
    java.math.BigDecimal sumTotalPending();

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.OVERDUE OR ((i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT) AND i.dueDate < CURRENT_DATE)")
    java.math.BigDecimal sumTotalOverdue();

    @Query("SELECT i FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PAID AND i.paidAt >= :since")
    java.util.List<Invoice> findPaidInvoicesSince(java.time.LocalDateTime since);

    boolean existsByInvoiceNumber(String invoiceNumber);

    java.util.Optional<Invoice> findTopByOrderByCreatedAtDesc();
}
