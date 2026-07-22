package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.QuestionBankItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionBankRepository extends JpaRepository<QuestionBankItem, UUID> {

    Page<QuestionBankItem> findByIsActiveTrue(Pageable pageable);

    Page<QuestionBankItem> findBySubjectAndIsActiveTrue(String subject, Pageable pageable);

    Page<QuestionBankItem> findByExamCategoryAndIsActiveTrue(String examCategory, Pageable pageable);

    Page<QuestionBankItem> findByQuestionTypeAndIsActiveTrue(String questionType, Pageable pageable);

    Page<QuestionBankItem> findByDifficultyAndIsActiveTrue(String difficulty, Pageable pageable);

    @Query("""
        SELECT q FROM QuestionBankItem q
        WHERE q.isActive = true
          AND (:subject IS NULL OR q.subject = :subject)
          AND (:topic IS NULL OR q.topic = :topic)
          AND (:examCategory IS NULL OR q.examCategory = :examCategory)
          AND (:questionType IS NULL OR q.questionType = :questionType)
          AND (:difficulty IS NULL OR q.difficulty = :difficulty)
          AND (:search IS NULL OR LOWER(q.text) LIKE :search OR LOWER(q.tags) LIKE :search)
        ORDER BY q.createdAt DESC
        """)
    Page<QuestionBankItem> findFiltered(
            @Param("subject") String subject,
            @Param("topic") String topic,
            @Param("examCategory") String examCategory,
            @Param("questionType") String questionType,
            @Param("difficulty") String difficulty,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT DISTINCT q.subject FROM QuestionBankItem q WHERE q.isActive = true ORDER BY q.subject")
    List<String> findAllSubjects();

    @Query("SELECT DISTINCT q.topic FROM QuestionBankItem q WHERE q.isActive = true AND q.subject = :subject ORDER BY q.topic")
    List<String> findTopicsBySubject(@Param("subject") String subject);

    long countByIsActiveTrue();

    long countBySubjectAndIsActiveTrue(String subject);

    long countByExamCategoryAndIsActiveTrue(String examCategory);

    long countByQuestionTypeAndIsActiveTrue(String questionType);

    long countByDifficultyAndIsActiveTrue(String difficulty);
}
