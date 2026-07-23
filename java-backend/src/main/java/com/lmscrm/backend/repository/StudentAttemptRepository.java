package com.lmscrm.backend.repository;

import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.domain.enums.ExamType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentAttemptRepository extends JpaRepository<StudentAttempt, UUID> {

    List<StudentAttempt> findByStudentIdOrderByStartedAtDesc(UUID studentId);

    List<StudentAttempt> findByExamId(UUID examId);

    @Query("SELECT sa FROM StudentAttempt sa WHERE sa.exam.id = :examId AND sa.student.id = :studentId ORDER BY sa.startedAt DESC")
    List<StudentAttempt> findAttempts(@Param("examId") UUID examId, @Param("studentId") UUID studentId);

    default Optional<StudentAttempt> findByExamIdAndStudentId(UUID examId, UUID studentId) {
        List<StudentAttempt> list = findAttempts(examId, studentId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Query("SELECT sa FROM StudentAttempt sa WHERE sa.exam.id = :examId AND sa.student.id = :studentId AND sa.finishedAt IS NULL")
    Optional<StudentAttempt> findActiveAttempt(@Param("examId") UUID examId, @Param("studentId") UUID studentId);

    List<StudentAttempt> findTop5ByStudentIdAndFinishedAtIsNotNullOrderByFinishedAtAsc(UUID studentId);

    // Added for stats and daily tasks
    List<StudentAttempt> findAllByStudentId(UUID studentId);

    List<StudentAttempt> findAllByStudentIdAndStartedAtAfter(UUID studentId, LocalDateTime since);

    /**
     * Talabaning topshirgan barcha imtihonlari sonini DB darajasida hisoblaydi.
     * In-memory .size() o'rniga COUNT() ishlatiladi — samaraliroq.
     */
    @Query("SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student.id = :studentId")
    long countByStudentId(@Param("studentId") UUID studentId);

    /**
     * Talabaning topshirgan imtihonlaridan o'rtacha overall_band ballini hisoblaydi.
     * overall_band null bo'lgan yozuvlar o'rtachaga kirmaydi (AVG avtomatik ignore qiladi).
     * Agar hech qanday ball bo'lmasa, NULL qaytadi (frontend "—" ko'rsatadi).
     */
    @Query("SELECT AVG(sa.overallBand) FROM StudentAttempt sa " +
           "WHERE sa.student.id = :studentId AND sa.overallBand IS NOT NULL")
    Double findAverageOverallBandByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT sa FROM StudentAttempt sa WHERE sa.student.id = :studentId AND sa.exam.type = :type AND sa.finishedAt IS NOT NULL ORDER BY sa.finishedAt DESC")
    Page<StudentAttempt> findCompletedAttemptsPage(@Param("studentId") UUID studentId, @Param("type") ExamType type, Pageable pageable);

    @Query("SELECT sa FROM StudentAttempt sa WHERE sa.student.id = :studentId AND sa.exam.type = :type AND sa.finishedAt IS NOT NULL ORDER BY sa.finishedAt DESC")
    List<StudentAttempt> findCompletedAttemptsList(@Param("studentId") UUID studentId, @Param("type") ExamType type);

    @Query("SELECT COUNT(sa) FROM StudentAttempt sa WHERE sa.student.id = :studentId AND sa.exam.type = :type")
    long countByStudentIdAndExamType(@Param("studentId") UUID studentId, @Param("type") ExamType type);
}
