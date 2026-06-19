package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.LibraryMaterial;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LibraryMaterialRepository extends JpaRepository<LibraryMaterial, UUID> {

    @Query("""
        SELECT lm FROM LibraryMaterial lm
        WHERE (CAST(:categoryId AS uuid) IS NULL OR lm.category.id = :categoryId)
          AND (:subject IS NULL OR lm.subject = :subject)
          AND (:grade IS NULL OR lm.grade = :grade)
          AND (:accessType IS NULL OR lm.accessType = :accessType)
          AND (:status IS NULL OR lm.status = :status)
          AND (:search IS NULL OR LOWER(lm.title) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(lm.author) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(lm.subject) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(lm.grade) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(lm.topic) LIKE LOWER(CONCAT('%', :search, '%')))
    """)
    Page<LibraryMaterial> findFiltered(
            @Param("categoryId") UUID categoryId,
            @Param("subject") String subject,
            @Param("grade") String grade,
            @Param("accessType") String accessType,
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT DISTINCT lm.subject FROM LibraryMaterial lm WHERE lm.status = 'ACTIVE' AND lm.subject IS NOT NULL ORDER BY lm.subject")
    List<String> findAllSubjects();

    @Query("SELECT DISTINCT lm.grade FROM LibraryMaterial lm WHERE lm.status = 'ACTIVE' AND lm.grade IS NOT NULL ORDER BY lm.grade")
    List<String> findAllGrades();

    long countByStatus(String status);
    
    @Query("SELECT COUNT(lm) FROM LibraryMaterial lm WHERE lm.pdfUrl IS NOT NULL AND lm.pdfUrl <> '' AND lm.status = :status")
    long countPdfMaterials(@Param("status") String status);
    
    long countByAccessTypeAndStatus(String accessType, String status);

    @Query("SELECT lm FROM LibraryMaterial lm WHERE lm.status = 'ACTIVE' ORDER BY lm.viewsCount DESC")
    List<LibraryMaterial> findPopularMaterials(Pageable pageable);
    
    @Query("SELECT lm FROM LibraryMaterial lm WHERE lm.status = 'ACTIVE' AND lm.category.code = :categoryCode ORDER BY lm.viewsCount DESC")
    List<LibraryMaterial> findPopularMaterialsByCategory(@Param("categoryCode") String categoryCode, Pageable pageable);
}
