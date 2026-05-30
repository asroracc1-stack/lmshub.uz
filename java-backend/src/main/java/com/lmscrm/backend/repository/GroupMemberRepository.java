package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    List<GroupMember> findByGroupId(UUID groupId);

    List<GroupMember> findByStudentId(UUID studentId);

    boolean existsByGroupIdAndStudentId(UUID groupId, UUID studentId);

    /**
     * Talabaning a'zo bo'lgan jami guruhlar sonini qaytaradi.
     */
    long countByStudentId(UUID studentId);

    /**
     * Talabaning faqat FAOL (isActive = true) guruhlari sonini qaytaradi.
     * Bu asosiy dashboard statistikasi uchun ishlatiladi.
     */
    @Query("SELECT COUNT(gm) FROM GroupMember gm JOIN gm.group g " +
           "WHERE gm.student.id = :studentId AND g.isActive = true")
    long countActiveGroupsByStudentId(@Param("studentId") UUID studentId);
}
