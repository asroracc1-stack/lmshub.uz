package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.LibraryProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LibraryProgressRepository extends JpaRepository<LibraryProgress, UUID> {
    Optional<LibraryProgress> findByUserIdAndMaterialId(UUID userId, UUID materialId);
}
