package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.dto.academic.DashboardBatchRequest;
import com.lmscrm.backend.event.AttendanceSavedEvent;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.*;
import com.lmscrm.backend.service.finance.CoinService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardBatchService {

    private final AttendanceRepository attendanceRepository;
    private final GradeRepository gradeRepository;
    private final LessonRepository lessonRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final CoinService coinService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void saveAllDashboardData(DashboardBatchRequest request, User teacher) {
        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (request.getRecords() == null || request.getRecords().isEmpty()) {
            return;
        }

        for (DashboardBatchRequest.StudentEntry record : request.getRecords()) {
            User student = userRepository.findById(record.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + record.getStudentId()));

            // 1. Attendance saving or updating
            Attendance attendance = attendanceRepository.findByLessonIdAndStudentId(lesson.getId(), student.getId())
                    .orElse(Attendance.builder()
                            .lesson(lesson)
                            .student(student)
                            .organization(lesson.getOrganization())
                            .build());

            attendance.setStatus(record.getStatus());
            // If comment is provided, we can also store it in attendance note as fallback
            if (record.getComment() != null) {
                attendance.setNote(record.getComment());
            }
            attendance.setMarkedBy(teacher);
            attendanceRepository.save(attendance);

            // 2. Grade saving or updating (if score is present)
            if (record.getScore() != null) {
                Grade grade = gradeRepository.findByLessonIdAndStudentId(lesson.getId(), student.getId())
                        .orElse(null);

                if (grade == null) {
                    grade = Grade.builder()
                            .student(student)
                            .teacher(teacher)
                            .subject(subject)
                            .lesson(lesson)
                            .score(record.getScore())
                            .maxScore(5)
                            .comment(record.getComment())
                            .organization(subject.getOrganization())
                            .build();
                } else {
                    grade.setScore(record.getScore());
                    grade.setComment(record.getComment());
                    grade.setTeacher(teacher);
                }
                gradeRepository.save(grade);
            }

            // 3. Coins rewarding (if coins count > 0)
            if (record.getCoins() != null && record.getCoins() > 0) {
                try {
                    String reason = "Darsdagi faollik";
                    if (record.getComment() != null && !record.getComment().isBlank()) {
                        reason = reason + ": " + record.getComment();
                    }
                    coinService.addCoins(student, record.getCoins(), reason, "SMART_DASHBOARD", teacher);
                } catch (Exception e) {
                    log.error("Failed to add coins for student {}: {}", student.getId(), e.getMessage());
                }
            }

            // 4. Publish Event for Asynchronous Telegram Notification
            eventPublisher.publishEvent(new AttendanceSavedEvent(
                    this,
                    student.getId(),
                    lesson.getId(),
                    subject.getId(),
                    record.getStatus(),
                    record.getScore(),
                    record.getComment(),
                    record.getCoins()
            ));
        }
    }
}
