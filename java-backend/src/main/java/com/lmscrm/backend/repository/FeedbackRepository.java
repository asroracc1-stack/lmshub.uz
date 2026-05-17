package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Feedback;
import com.lmscrm.backend.domain.enums.FeedbackStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    List<Feedback> findAllByUserId(UUID userId);
    List<Feedback> findAllByStatus(FeedbackStatus status);
}
