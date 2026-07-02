package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.StudentRfidCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRfidCardRepository extends JpaRepository<StudentRfidCard, UUID> {
    Optional<StudentRfidCard> findByCardUidAndIsActiveTrue(String cardUid);
}
