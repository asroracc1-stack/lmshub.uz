package com.lmscrm.backend.service.communication;

import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.domain.entity.StudentFeedback;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.communication.StudentFeedbackDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.OrganizationRepository;
import com.lmscrm.backend.repository.StudentFeedbackRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentFeedbackService {

    private final StudentFeedbackRepository studentFeedbackRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public StudentFeedbackDto createFeedback(StudentFeedbackDto dto, User teacher) {
        User student = userRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Organization org = organizationRepository.findById(teacher.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        StudentFeedback feedback = StudentFeedback.builder()
                .student(student)
                .teacher(teacher)
                .organization(org)
                .title(dto.getTitle())
                .body(dto.getBody())
                .type(dto.getType())
                .build();

        StudentFeedback saved = studentFeedbackRepository.save(feedback);
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<StudentFeedbackDto> getTeacherFeedbacks(UUID teacherId) {
        return studentFeedbackRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentFeedbackDto> getStudentFeedbacks(UUID studentId) {
        return studentFeedbackRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public StudentFeedbackDto updateFeedback(UUID feedbackId, StudentFeedbackDto dto, User teacher) {
        StudentFeedback feedback = studentFeedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));

        if (teacher.getRole() != AppRole.SUPER_ADMIN && 
            teacher.getRole() != AppRole.ADMIN && 
            !feedback.getTeacher().getId().equals(teacher.getId())) {
            throw new RuntimeException("Unauthorized to update this feedback");
        }

        feedback.setTitle(dto.getTitle());
        feedback.setBody(dto.getBody());
        feedback.setType(dto.getType());

        StudentFeedback saved = studentFeedbackRepository.save(feedback);
        return mapToDto(saved);
    }

    @Transactional
    public void deleteFeedback(UUID feedbackId, User teacher) {
        StudentFeedback feedback = studentFeedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));

        if (teacher.getRole() != AppRole.SUPER_ADMIN && 
            teacher.getRole() != AppRole.ADMIN && 
            !feedback.getTeacher().getId().equals(teacher.getId())) {
            throw new RuntimeException("Unauthorized to delete this feedback");
        }

        studentFeedbackRepository.delete(feedback);
    }

    public StudentFeedbackDto mapToDto(StudentFeedback f) {
        return StudentFeedbackDto.builder()
                .id(f.getId())
                .studentId(f.getStudent().getId())
                .studentName(f.getStudent().getFullName() != null ? f.getStudent().getFullName() : f.getStudent().getUsername())
                .teacherId(f.getTeacher().getId())
                .teacherName(f.getTeacher().getFullName() != null ? f.getTeacher().getFullName() : f.getTeacher().getUsername())
                .organizationId(f.getOrganization().getId())
                .title(f.getTitle())
                .body(f.getBody())
                .type(f.getType())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
