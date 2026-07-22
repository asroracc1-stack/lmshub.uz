package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
    Optional<MediaAsset> findByFileHash(String fileHash);
}
