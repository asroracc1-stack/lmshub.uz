package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.Grade;
import com.lmscrm.backend.domain.entity.Lesson;
import com.lmscrm.backend.domain.entity.Subject;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.GradeDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.AcademicMapper;
import com.lmscrm.backend.repository.GradeRepository;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.SubjectRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.communication.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GradeService {

    private final GradeRepository gradeRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;
    private final AcademicMapper mapper;
    private final TelegramNotificationService telegramNotificationService;

    @Transactional
    public GradeDto addGrade(GradeDto request, User teacher) {
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        Lesson lesson = null;
        if (request.getLessonId() != null) {
            lesson = lessonRepository.findById(request.getLessonId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        }

        Grade grade = Grade.builder()
                .student(student)
                .teacher(teacher)
                .subject(subject)
                .lesson(lesson)
                .score(request.getScore())
                .maxScore(request.getMaxScore() != null ? request.getMaxScore() : 100)
                .comment(request.getComment())
                .organization(subject.getOrganization())
                .build();

        Grade savedGrade = gradeRepository.save(grade);

        // Real-time Telegram notification to parents
        try {
            telegramNotificationService.notifyGrade(student, savedGrade.getScore(), savedGrade.getMaxScore(), subject.getName(), savedGrade.getComment());
        } catch (Exception e) {
            // Log but don't fail the transaction
        }

        return mapper.toGradeDto(savedGrade);
    }

    @Transactional(readOnly = true)
    public List<GradeDto> getStudentGrades(UUID studentId) {
        return gradeRepository.findByStudentId(studentId).stream()
                .map(mapper::toGradeDto)
                .collect(Collectors.toList());
    }
}
