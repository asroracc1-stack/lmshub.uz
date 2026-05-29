package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.GroupTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupTeacherRepository extends JpaRepository<GroupTeacher, UUID> {
    boolean existsByGroupIdAndTeacherId(UUID groupId, UUID teacherId);
    List<GroupTeacher> findByGroupId(UUID groupId);
    List<GroupTeacher> findByTeacherId(UUID teacherId);
    long countByTeacherId(UUID teacherId);
}
