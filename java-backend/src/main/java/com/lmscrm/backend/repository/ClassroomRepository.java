package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, UUID> {
    List<Classroom> findByCampusId(UUID campusId);
    List<Classroom> findByOrganizationId(UUID organizationId);
    List<Classroom> findByCampusIdAndIsActiveTrue(UUID campusId);
}
