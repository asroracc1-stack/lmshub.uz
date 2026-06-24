package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.DbStoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DbStoredFileRepository extends JpaRepository<DbStoredFile, String> {
    Optional<DbStoredFile> findByFilename(String filename);
}
