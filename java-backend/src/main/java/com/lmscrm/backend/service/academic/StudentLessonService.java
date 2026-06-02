package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.dto.academic.StudentLessonDto;
import com.lmscrm.backend.dto.academic.StudentLessonResponse;
import com.lmscrm.backend.domain.entity.Lesson;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
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

    public StudentLessonResponse getLessonsForStudent(UUID studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("Student not found"));
        List<StudentLessonDto> lessons = lessonRepository.findAllByStudentId(studentId)
                .stream()
                .map(l -> new StudentLessonDto(
                        l.getId(),
                        l.getTitle(),
                        l.getStartsAt(),
                        l.getEndsAt(),
                        l.getAttendanceStatus(),
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
