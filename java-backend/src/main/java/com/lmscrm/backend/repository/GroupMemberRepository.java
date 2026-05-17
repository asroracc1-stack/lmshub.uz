package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    List<GroupMember> findByGroupId(UUID groupId);
    List<GroupMember> findByStudentId(UUID studentId);
    boolean existsByGroupIdAndStudentId(UUID groupId, UUID studentId);
}
