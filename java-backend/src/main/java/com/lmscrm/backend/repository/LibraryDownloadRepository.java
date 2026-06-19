package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.LibraryDownload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LibraryDownloadRepository extends JpaRepository<LibraryDownload, UUID> {
    long countByMaterialId(UUID materialId);
}
