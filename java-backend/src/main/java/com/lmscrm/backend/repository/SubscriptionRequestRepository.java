package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.SubscriptionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SubscriptionRequestRepository extends JpaRepository<SubscriptionRequest, UUID> {
    List<SubscriptionRequest> findAllByOrderByRequestedAtDesc();
    List<SubscriptionRequest> findByStatusOrderByRequestedAtDesc(String status);
}
