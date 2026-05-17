package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    java.util.Optional<Profile> findByUser(com.lmscrm.backend.domain.entity.User user);
}
