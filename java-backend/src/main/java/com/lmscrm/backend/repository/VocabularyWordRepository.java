package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.VocabularyWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VocabularyWordRepository extends JpaRepository<VocabularyWord, UUID> {
    
    Optional<VocabularyWord> findByWordIgnoreCase(String word);

    List<VocabularyWord> findByLevelAndUnitOrderByWordAsc(String level, Integer unit);

    List<VocabularyWord> findByLevelOrderByUnitAscWordAsc(String level);

    @Query("SELECT DISTINCT w.unit FROM VocabularyWord w WHERE w.level = :level ORDER BY w.unit ASC")
    List<Integer> findUnitsByLevel(@Param("level") String level);

    @Query("SELECT w FROM VocabularyWord w WHERE " +
           "(LOWER(w.word) LIKE :search OR LOWER(w.translation) LIKE :search) AND " +
           "(:level IS NULL OR w.level = :level) AND " +
           "(:category IS NULL OR w.category = :category)")
    Page<VocabularyWord> searchWords(
            @Param("search") String search,
            @Param("level") String level,
            @Param("category") String category,
            Pageable pageable
    );

    @Query("SELECT DISTINCT w.category FROM VocabularyWord w WHERE w.category IS NOT NULL ORDER BY w.category ASC")
    List<String> findAllCategories();
}
