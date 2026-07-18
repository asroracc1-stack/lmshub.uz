package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.UserVocabularyAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserVocabularyAchievementRepository extends JpaRepository<UserVocabularyAchievement, UUID> {
    
    List<UserVocabularyAchievement> findByUserId(UUID userId);

    Optional<UserVocabularyAchievement> findByUserIdAndAchievementCode(UUID userId, String achievementCode);
}
