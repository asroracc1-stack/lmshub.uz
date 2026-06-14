package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.UserGamificationProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserGamificationProgressRepository extends JpaRepository<UserGamificationProgress, UUID> {
    Optional<UserGamificationProgress> findByUserId(UUID userId);
}
