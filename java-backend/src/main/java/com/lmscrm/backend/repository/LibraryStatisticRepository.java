package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.LibraryStatistic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LibraryStatisticRepository extends JpaRepository<LibraryStatistic, UUID> {
    Optional<LibraryStatistic> findByMetricName(String metricName);
}
