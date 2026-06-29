package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.AvatarSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AvatarSettingsRepository extends JpaRepository<AvatarSettings, UUID> {
}
