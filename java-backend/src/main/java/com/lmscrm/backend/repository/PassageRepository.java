package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Passage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PassageRepository extends JpaRepository<Passage, UUID> {
    List<Passage> findByExamIdOrderByPositionOrderAsc(UUID examId);
    void deleteByExamId(UUID examId);
}
