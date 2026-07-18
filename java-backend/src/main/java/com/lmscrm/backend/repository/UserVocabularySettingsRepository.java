package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.UserVocabularySettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserVocabularySettingsRepository extends JpaRepository<UserVocabularySettings, UUID> {
}
