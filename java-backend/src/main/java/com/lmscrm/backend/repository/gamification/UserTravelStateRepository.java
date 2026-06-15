package com.lmscrm.backend.repository.gamification;

import com.lmscrm.backend.domain.entity.gamification.UserTravelState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserTravelStateRepository extends JpaRepository<UserTravelState, UUID> {
    Optional<UserTravelState> findByUserId(UUID userId);
}
