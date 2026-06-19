package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.LibraryView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LibraryViewRepository extends JpaRepository<LibraryView, UUID> {
    long countByMaterialId(UUID materialId);
}
