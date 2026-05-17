package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface NewsRepository extends JpaRepository<News, UUID> {
}
