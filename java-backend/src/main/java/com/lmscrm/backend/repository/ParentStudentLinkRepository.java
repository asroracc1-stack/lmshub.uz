package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.ParentStudentLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParentStudentLinkRepository extends JpaRepository<ParentStudentLink, UUID> {

    @Query("SELECT l FROM ParentStudentLink l WHERE l.parent.id = :parentId")
    List<ParentStudentLink> findAllByParentId(@Param("parentId") UUID parentId);

    @Query("SELECT l FROM ParentStudentLink l WHERE l.student.id = :studentId")
    List<ParentStudentLink> findAllByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT COUNT(l) > 0 FROM ParentStudentLink l WHERE l.parent.id = :parentId AND l.student.id = :studentId")
    boolean existsByParentIdAndStudentId(@Param("parentId") UUID parentId, @Param("studentId") UUID studentId);

    // Custom methods for AdminUserService
    @Modifying
    @Transactional
    void deleteByParentId(UUID parentId); // Deletes all links for a given parent

    Optional<ParentStudentLink> findByParentId(UUID parentId); // Finds a single link for a given parent
}
