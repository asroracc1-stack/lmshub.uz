package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Payment;
import com.lmscrm.backend.dto.finance.MonthlyRevenue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByStudentId(UUID studentId);
    List<Payment> findByInvoiceId(UUID invoiceId);
    List<Payment> findByOrganizationId(UUID organizationId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p")
    BigDecimal sumTotalRevenue();

    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.organization.id = :orgId")
    BigDecimal sumTotalRevenueByOrganizationId(UUID orgId);

    @Query(value = "SELECT to_char(p.created_at, 'YYYY-MM') as period, SUM(p.amount) as amount " +
                   "FROM payments p " +
                   "WHERE p.organization_id = :orgId " +
                   "GROUP BY period ORDER BY period DESC", nativeQuery = true)
    List<MonthlyRevenue> getMonthlyRevenueByOrganizationId(UUID orgId);
}
