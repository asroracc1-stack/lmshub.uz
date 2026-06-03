package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.dto.academic.StudentLessonDto;
import com.lmscrm.backend.dto.academic.StudentLessonResponse;
import com.lmscrm.backend.domain.entity.Lesson;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.domain.entity.Attendance;
import com.lmscrm.backend.repository.AttendanceRepository;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Servis talabaning barcha darslarini olish uchun.
 */
@Service
@RequiredArgsConstructor
public class StudentLessonService {

    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;

    public StudentLessonResponse getLessonsForStudent(UUID studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found"));
                
        List<Lesson> lessonList = lessonRepository.findAllByStudentId(studentId);
        List<UUID> lessonIds = lessonList.stream().map(Lesson::getId).collect(Collectors.toList());
        
        Map<UUID, AttendanceStatus> attendanceMap = Map.of();
        if (!lessonIds.isEmpty()) {
            List<Attendance> attendances = attendanceRepository.findByStudentIdAndLessonIdIn(studentId, lessonIds);
            attendanceMap = attendances.stream()
                    .collect(Collectors.toMap(a -> a.getLesson().getId(), Attendance::getStatus, (s1, s2) -> s1));
        }

        Map<UUID, AttendanceStatus> finalAttendanceMap = attendanceMap;
        
        List<StudentLessonDto> lessons = lessonList
                .stream()
                .map(l -> new StudentLessonDto(
                        l.getId(),
                        l.getTitle(),
                        l.getStartsAt(),
                        l.getEndsAt(),
                        finalAttendanceMap.get(l.getId()), // Map student's personal attendance
                        l.getTeacher() != null ? l.getTeacher().getFullName() : "",
                        l.getGroup() != null ? l.getGroup().getName() : "",
                        l.getSubject() != null ? l.getSubject().getName() : "",
                        l.getRoom() != null ? l.getRoom() : "",
                        l.getDescription() != null ? l.getDescription() : ""
                ))
                .collect(Collectors.toList());
        return new StudentLessonResponse(lessons);
    }
}
