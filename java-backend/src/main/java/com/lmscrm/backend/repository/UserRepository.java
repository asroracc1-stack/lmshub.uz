package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByEmailOrUsername(String email, String username);
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") AppRole role);

    long countByCreatedAtBefore(LocalDateTime date);
    
    long countByOrganizationId(UUID organizationId);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.organizationId = :orgId")
    long countByRoleAndOrganizationId(@Param("role") AppRole role, @Param("orgId") UUID orgId);
    
    long countByOrganizationIdAndRole(UUID organizationId, AppRole role);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.createdAt < :date")
    long countByRoleAndCreatedAtBefore(@Param("role") AppRole role, @Param("date") LocalDateTime date);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.organizationId = :orgId AND u.createdAt < :date")
    long countByRoleAndOrganizationIdAndCreatedAtBefore(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("date") LocalDateTime date);
    
    @Query("SELECT u FROM User u WHERE " +
           "(LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%') OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.organizationId = :organizationId AND " +
           "(LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%') OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<User> searchUsersInOrganization(@Param("query") String query, @Param("organizationId") UUID organizationId, Pageable pageable);

    Page<User> findByRole(AppRole role, Pageable pageable);
    List<User> findByRole(AppRole role);
    Page<User> findByRoleAndOrganizationId(AppRole role, UUID organizationId, Pageable pageable);
    List<User> findByRoleAndOrganizationId(AppRole role, UUID organizationId);

    List<User> findByOrganizationId(UUID organizationId);
    Page<User> findByOrganizationId(UUID organizationId, Pageable pageable);
    
    List<User> findByGroupId(UUID groupId);
    List<User> findByRoleAndGroupId(AppRole role, UUID groupId);
    Long countByGroupId(UUID groupId);

    // New method for universal search by role
    @Query("SELECT u FROM User u WHERE u.role = :role AND (" +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :searchTerm, '%'))")
    List<User> findByRoleAndSearchTerm(@Param("role") AppRole role, @Param("searchTerm") String searchTerm);

    @Query("SELECT u FROM User u WHERE u.role = :role AND (" +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%'))")
    Page<User> searchByRoleAndQuery(@Param("role") AppRole role, @Param("query") String query, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role = :role AND u.organizationId = :orgId AND (" +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :query, '%'))")
    Page<User> searchByRoleAndOrganizationAndQuery(@Param("role") AppRole role, @Param("orgId") UUID orgId, @Param("query") String query, Pageable pageable);
}
