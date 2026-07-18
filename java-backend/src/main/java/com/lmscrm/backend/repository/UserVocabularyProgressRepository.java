package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.UserVocabularyProgress;
import com.lmscrm.backend.domain.enums.WordStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserVocabularyProgressRepository extends JpaRepository<UserVocabularyProgress, UUID> {

    Optional<UserVocabularyProgress> findByUserIdAndWordId(UUID userId, UUID wordId);

    List<UserVocabularyProgress> findByUserIdAndIsBookmarkedTrue(UUID userId);

    @Query("SELECT p FROM UserVocabularyProgress p JOIN FETCH p.word w WHERE p.user.id = :userId AND p.isBookmarked = true")
    List<UserVocabularyProgress> findBookmarksByUserId(@Param("userId") UUID userId);

    @Query("SELECT p FROM UserVocabularyProgress p JOIN FETCH p.word w WHERE p.user.id = :userId AND p.isFavorite = true")
    List<UserVocabularyProgress> findFavoritesByUserId(@Param("userId") UUID userId);

    @Query("SELECT p FROM UserVocabularyProgress p JOIN FETCH p.word w WHERE p.user.id = :userId AND p.nextReviewAt <= :now ORDER BY p.nextReviewAt ASC")
    List<UserVocabularyProgress> findDueReviews(@Param("userId") UUID userId, @Param("now") LocalDateTime now);

    @Query("SELECT p FROM UserVocabularyProgress p JOIN FETCH p.word w WHERE p.user.id = :userId AND " +
           "(p.speakingAccuracyAvg < 70.0 OR (p.timesTotalWriting > 0 AND (CAST(p.timesCorrectWriting AS double) / p.timesTotalWriting) < 0.7)) " +
           "ORDER BY p.speakingAccuracyAvg ASC, p.timesCorrectWriting ASC")
    List<UserVocabularyProgress> findWeakWords(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT COUNT(p) FROM UserVocabularyProgress p WHERE p.user.id = :userId AND p.status = :status")
    long countByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") WordStatus status);

    @Query("SELECT COUNT(p) FROM UserVocabularyProgress p WHERE p.user.id = :userId AND p.status != 'NEW'")
    long countLearnedWords(@Param("userId") UUID userId);

    @Query("SELECT AVG(p.speakingAccuracyAvg) FROM UserVocabularyProgress p WHERE p.user.id = :userId AND p.speakingAccuracyAvg > 0")
    Double getAverageSpeakingAccuracy(@Param("userId") UUID userId);

    @Query("SELECT SUM(p.timesCorrectWriting), SUM(p.timesTotalWriting) FROM UserVocabularyProgress p WHERE p.user.id = :userId")
    List<Object[]> getWritingAccuracyStats(@Param("userId") UUID userId);

    @Query("SELECT p FROM UserVocabularyProgress p JOIN FETCH p.word w WHERE p.user.id = :userId AND w.level = :level")
    List<UserVocabularyProgress> findAllByUserIdAndLevel(@Param("userId") UUID userId, @Param("level") String level);
}
