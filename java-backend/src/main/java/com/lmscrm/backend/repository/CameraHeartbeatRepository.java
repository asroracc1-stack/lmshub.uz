package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.CameraHeartbeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CameraHeartbeatRepository extends JpaRepository<CameraHeartbeat, UUID> {
    List<CameraHeartbeat> findByCameraIdOrderByTimestampDesc(UUID cameraId);
}
