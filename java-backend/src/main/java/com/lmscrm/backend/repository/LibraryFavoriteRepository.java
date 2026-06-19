package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.LibraryFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LibraryFavoriteRepository extends JpaRepository<LibraryFavorite, UUID> {
    Optional<LibraryFavorite> findByUserIdAndMaterialId(UUID userId, UUID materialId);
    boolean existsByUserIdAndMaterialId(UUID userId, UUID materialId);
    List<LibraryFavorite> findByUserIdOrderByCreatedAtDesc(UUID userId);
    void deleteByUserIdAndMaterialId(UUID userId, UUID materialId);
}
