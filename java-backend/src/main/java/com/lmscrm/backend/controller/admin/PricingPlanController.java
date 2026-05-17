package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.PricingPlan;
import com.lmscrm.backend.repository.PricingPlanRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/pricing-plans")
@RequiredArgsConstructor

@Tag(name = "Admin Pricing Plan Controller", description = "Endpoints for SuperAdmin to manage pricing plans")
public class PricingPlanController {

    private final PricingPlanRepository pricingPlanRepository;

    @GetMapping
    @Operation(summary = "Get All Pricing Plans")
    public ResponseEntity<List<PricingPlan>> getAll() {
        return ResponseEntity.ok(pricingPlanRepository.findAllByOrderBySortOrderAsc());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create Pricing Plan")
    public ResponseEntity<PricingPlan> create(@RequestBody PricingPlan plan) {
        return ResponseEntity.ok(pricingPlanRepository.save(plan));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update Pricing Plan")
    public ResponseEntity<PricingPlan> update(@PathVariable UUID id, @RequestBody PricingPlan planDetails) {
        PricingPlan plan = pricingPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));
        plan.setName(planDetails.getName());
        plan.setDescription(planDetails.getDescription());
        plan.setPriceMonthly(planDetails.getPriceMonthly());
        plan.setPriceYearly(planDetails.getPriceYearly());
        plan.setCurrency(planDetails.getCurrency());
        plan.setPriceSuffix(planDetails.getPriceSuffix());
        plan.setFeatures(planDetails.getFeatures());
        plan.setCtaLabel(planDetails.getCtaLabel());
        plan.setCtaLink(planDetails.getCtaLink());
        plan.setIsPopular(planDetails.getIsPopular());
        plan.setIsActive(planDetails.getIsActive());
        plan.setSortOrder(planDetails.getSortOrder());
        return ResponseEntity.ok(pricingPlanRepository.save(plan));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete Pricing Plan")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        pricingPlanRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
