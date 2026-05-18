package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.Attendance;
import com.lmscrm.backend.domain.entity.Lesson;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.dto.academic.AttendanceDto;
import com.lmscrm.backend.dto.academic.BatchAttendanceRequest;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.AcademicMapper;
import com.lmscrm.backend.repository.AttendanceRepository;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.communication.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final AcademicMapper mapper;
    private final TelegramNotificationService telegramNotificationService;

    @Transactional
    public List<AttendanceDto> markBatchAttendance(BatchAttendanceRequest request, User markedBy) {
        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        List<Attendance> savedRecords = new ArrayList<>();

        for (BatchAttendanceRequest.StudentAttendance record : request.getRecords()) {
            User student = userRepository.findById(record.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + record.getStudentId()));

            // In a real app, we might check if an attendance record already exists and update it instead
            Attendance attendance = Attendance.builder()
                    .lesson(lesson)
                    .student(student)
                    .status(record.getStatus())
                    .note(record.getNote())
                    .markedBy(markedBy)
                    .organization(lesson.getOrganization())
                    .build();

            savedRecords.add(attendanceRepository.save(attendance));

            // Logic: Warning if absent 3 or more times
            if (record.getStatus() == AttendanceStatus.ABSENT) {
                checkAndAlertForExcessiveAbsences(student.getId());
            }

            // Real-time Telegram notification to parents
            try {
                telegramNotificationService.notifyAttendance(student, record.getStatus(), lesson.getTitle());
            } catch (Exception e) {
                log.error("Failed to send Telegram notification for attendance: {}", e.getMessage());
            }
        }

        return savedRecords.stream()
                .map(mapper::toAttendanceDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AttendanceDto markSingleAttendance(AttendanceDto request, User markedBy) {
        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Attendance attendance = attendanceRepository.findByLessonIdAndStudentId(lesson.getId(), student.getId())
                .orElse(Attendance.builder()
                        .lesson(lesson)
                        .student(student)
                        .organization(lesson.getOrganization())
                        .build());

        attendance.setStatus(request.getStatus());
        if (request.getNote() != null) {
            attendance.setNote(request.getNote());
        }
        attendance.setMarkedBy(markedBy);

        Attendance saved = attendanceRepository.save(attendance);

        if (saved.getStatus() == AttendanceStatus.ABSENT) {
            checkAndAlertForExcessiveAbsences(student.getId());
        }

        try {
            telegramNotificationService.notifyAttendance(student, saved.getStatus(), lesson.getTitle());
        } catch (Exception e) {
            log.error("Failed to send Telegram notification for attendance: {}", e.getMessage());
        }

        return mapper.toAttendanceDto(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceDto> getMyAttendance(UUID studentId) {
        return attendanceRepository.findByStudentId(studentId).stream()
                .map(mapper::toAttendanceDto)
                .collect(Collectors.toList());
    }

    private void checkAndAlertForExcessiveAbsences(UUID studentId) {
        long absentCount = attendanceRepository.countByStudentIdAndStatus(studentId, AttendanceStatus.ABSENT);
        if (absentCount >= 3) {
            // Placeholder: Generate a notification or log
            log.warn("ALERT: Student {} has been absent {} times!", studentId, absentCount);
            // Example: notificationService.sendWarningToParent(studentId, "Your child has missed 3+ classes.");
        }
    }
}
