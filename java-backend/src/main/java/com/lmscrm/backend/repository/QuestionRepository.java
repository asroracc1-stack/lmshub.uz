package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByExamIdOrderByPositionOrderAsc(UUID examId);
    List<Question> findByPassageIdOrderByPositionOrderAsc(UUID passageId);
    int countByExamId(UUID examId);
}
