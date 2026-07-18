package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.UserVocabularyUnitProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserVocabularyUnitProgressRepository extends JpaRepository<UserVocabularyUnitProgress, UUID> {

    Optional<UserVocabularyUnitProgress> findByUserIdAndLevelAndUnit(UUID userId, String level, Integer unit);

    List<UserVocabularyUnitProgress> findByUserIdAndLevel(UUID userId, String level);

    @Query("SELECT COUNT(u) FROM UserVocabularyUnitProgress u WHERE u.user.id = :userId AND u.stageCompleted = 3")
    long countCompletedUnits(@Param("userId") UUID userId);

    @Query("SELECT COUNT(u) FROM UserVocabularyUnitProgress u WHERE u.user.id = :userId AND u.level = :level AND u.stageCompleted = 3")
    long countCompletedUnitsByLevel(@Param("userId") UUID userId, @Param("level") String level);

    @Query("SELECT MAX(u.unit) FROM UserVocabularyUnitProgress u WHERE u.user.id = :userId AND u.level = :level AND u.stageCompleted = 3")
    Integer findMaxCompletedUnitByLevel(@Param("userId") UUID userId, @Param("level") String level);
}
