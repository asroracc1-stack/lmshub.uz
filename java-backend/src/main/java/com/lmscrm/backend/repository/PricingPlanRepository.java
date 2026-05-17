package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.PricingPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;

@Repository
public interface PricingPlanRepository extends JpaRepository<PricingPlan, UUID> {
    List<PricingPlan> findAllByOrderBySortOrderAsc();
    List<PricingPlan> findByIsActiveTrueOrderBySortOrderAsc();
}
