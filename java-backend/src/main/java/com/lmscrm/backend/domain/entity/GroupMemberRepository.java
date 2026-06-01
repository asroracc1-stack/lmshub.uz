package com.lmscrm.backend.domain.entity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for {@link GroupMember} entities.
 */
@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    // Add custom query methods here if needed
}
