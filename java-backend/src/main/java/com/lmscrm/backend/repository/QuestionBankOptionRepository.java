package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.QuestionBankOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionBankOptionRepository extends JpaRepository<QuestionBankOption, UUID> {
    List<QuestionBankOption> findByQuestionBankItemIdOrderByPositionOrderAsc(UUID questionBankItemId);
    void deleteByQuestionBankItemId(UUID questionBankItemId);
}
