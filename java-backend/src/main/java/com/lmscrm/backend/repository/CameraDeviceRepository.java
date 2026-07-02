package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.CameraDevice;
import com.lmscrm.backend.domain.enums.CameraStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CameraDeviceRepository extends JpaRepository<CameraDevice, UUID> {
    List<CameraDevice> findByOrganizationId(UUID organizationId);
    List<CameraDevice> findByCampusId(UUID campusId);
    List<CameraDevice> findByClassroomId(UUID classroomId);
    List<CameraDevice> findByIsActiveTrue();
    List<CameraDevice> findByOrganizationIdAndStatus(UUID organizationId, CameraStatus status);
}
