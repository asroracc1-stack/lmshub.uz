package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.CoinTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoinTransactionRepository extends JpaRepository<CoinTransaction, UUID> {
    List<CoinTransaction> findByStudentId(UUID studentId);

    @Query("SELECT SUM(c.amount) FROM CoinTransaction c WHERE c.student.id = :studentId")
    Integer getStudentCoinBalance(UUID studentId);

    @Query("SELECT c.student, SUM(c.amount) as total FROM CoinTransaction c " +
           "WHERE c.student.role = :role " +
           "GROUP BY c.student " +
           "ORDER BY total DESC")
    List<Object[]> getLeaderboardByRole(
            @org.springframework.data.repository.query.Param("role") com.lmscrm.backend.domain.enums.AppRole role);

    @Query("SELECT c.student, SUM(c.amount) as total FROM CoinTransaction c " +
           "WHERE c.student.role = :role " +
           "AND c.createdAt >= :startDate " +
           "GROUP BY c.student " +
           "ORDER BY total DESC")
    List<Object[]> getLeaderboardByRoleAndDateAfter(
            @org.springframework.data.repository.query.Param("role") com.lmscrm.backend.domain.enums.AppRole role, 
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate);

    @Query("SELECT c.student, SUM(c.amount) as total FROM CoinTransaction c " +
           "WHERE c.student.role = :role " +
           "AND c.student.organizationId IS NULL " +
           "GROUP BY c.student " +
           "ORDER BY total DESC")
    List<Object[]> getGlobalLeaderboardByRole(
            @org.springframework.data.repository.query.Param("role") com.lmscrm.backend.domain.enums.AppRole role);

    @Query("SELECT c.student, SUM(c.amount) as total FROM CoinTransaction c " +
           "WHERE c.student.role = :role " +
           "AND c.student.organizationId IS NULL " +
           "AND c.createdAt >= :startDate " +
           "GROUP BY c.student " +
           "ORDER BY total DESC")
    List<Object[]> getGlobalLeaderboardByRoleAndDateAfter(
            @org.springframework.data.repository.query.Param("role") com.lmscrm.backend.domain.enums.AppRole role, 
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDateTime startDate);
}