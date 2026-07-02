package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.DynamicLessonQrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DynamicLessonQrCodeRepository extends JpaRepository<DynamicLessonQrCode, UUID> {
    Optional<DynamicLessonQrCode> findByQrToken(String qrToken);
}
