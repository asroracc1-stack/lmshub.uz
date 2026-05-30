package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    @Query("SELECT i FROM Invoice i WHERE " +
           "(:query IS NULL OR :query = '' OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(i.organization.name) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "(:status IS NULL OR LOWER(:status) = 'all' OR " +
           "(:status = 'PAID' AND i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PAID) OR " +
           "(:status = 'SENT' AND (i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING)) OR " +
           "(:status = 'DRAFT' AND i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.DRAFT) OR " +
           "(:status = 'CANCELLED' AND i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.CANCELLED) OR " +
           "(:status = 'OVERDUE' AND (i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.OVERDUE OR ((i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING) AND i.dueDate < CURRENT_DATE))))")
    Page<Invoice> filterInvoices(String query, String status, Pageable pageable);

    @Query("SELECT i FROM Invoice i WHERE LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Invoice> searchInvoices(String query, Pageable pageable);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.organization.id = :orgId AND i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT")
    BigDecimal sumPendingPaymentsByOrganizationId(UUID orgId);

    List<Invoice> findByStudentId(UUID studentId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PAID")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE (i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT) AND i.dueDate >= CURRENT_DATE")
    BigDecimal sumTotalPending();

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.OVERDUE OR ((i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT) AND i.dueDate < CURRENT_DATE)")
    BigDecimal sumTotalOverdue();

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PAID")
    long countTotalRevenueInvoices();

    @Query("SELECT COUNT(i) FROM Invoice i WHERE (i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT) AND i.dueDate >= CURRENT_DATE")
    long countTotalPendingInvoices();

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.OVERDUE OR ((i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING OR i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.SENT) AND i.dueDate < CURRENT_DATE)")
    long countTotalOverdueInvoices();

    @Query("SELECT i FROM Invoice i WHERE i.status = com.lmscrm.backend.domain.enums.InvoiceStatus.PAID AND i.paidAt >= :since")
    List<Invoice> findPaidInvoicesSince(LocalDateTime since);

    boolean existsByInvoiceNumber(String invoiceNumber);

    Optional<Invoice> findTopByOrderByCreatedAtDesc();

    /**
     * Talabaning to'lanmagan (PENDING, SENT, OVERDUE) invoicelar yig'indisi.
     * Bu talabaning umumiy qarzdorligidir.
     * COALESCE(SUM, 0) — hech qanday invoice bo'lmasa 0 qaytaradi.
     */
    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Invoice i " +
           "WHERE i.student.id = :studentId " +
           "AND i.status IN (" +
           "  com.lmscrm.backend.domain.enums.InvoiceStatus.PENDING, " +
           "  com.lmscrm.backend.domain.enums.InvoiceStatus.SENT, " +
           "  com.lmscrm.backend.domain.enums.InvoiceStatus.OVERDUE" +
           ")")
    BigDecimal sumPendingBalanceByStudentId(@Param("studentId") UUID studentId);
}
