package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.FaceEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface FaceEmbeddingRepository extends JpaRepository<FaceEmbedding, UUID> {
    List<FaceEmbedding> findByStudentId(UUID studentId);
}
