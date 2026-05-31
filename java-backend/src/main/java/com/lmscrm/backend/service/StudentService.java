package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.StudentSearchResponse;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final UserRepository userRepository;

    public List<StudentSearchResponse> searchStudents(String query) {
        List<User> students = userRepository.findByRole(AppRole.STUDENT);

        if (query != null && !query.trim().isEmpty()) {
            String lowerCaseQuery = query.toLowerCase();
            students = students.stream()
                    .filter(student -> student.getFullName() != null && student.getFullName().toLowerCase().contains(lowerCaseQuery))
                    .collect(Collectors.toList());
        }

        return students.stream()
                .map(student -> StudentSearchResponse.builder()
                        .id(student.getId())
                        .fullName(student.getFullName())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentSearchResponse> getStudentsByGroupId(UUID groupId) {
        List<User> students = userRepository.findByRoleAndGroupId(AppRole.STUDENT, groupId);
        if (students.isEmpty()) {
            // Agar talabalar topilmasa, ResourceNotFoundException tashlashimiz mumkin
            // yoki bo'sh ro'yxat qaytarishimiz mumkin. Hozircha bo'sh ro'yxat qaytaramiz.
            // Agar "Bu guruhda talaba yo'q" xabarini aniqroq berish kerak bo'lsa,
            // bu yerda ResourceNotFoundException tashlash maqsadga muvofiq bo'ladi.
            // throw new ResourceNotFoundException("No students found in group with ID: " + groupId);
        }
        return students.stream()
                .map(student -> StudentSearchResponse.builder()
                        .id(student.getId())
                        .fullName(student.getFullName())
                        .build())
                .collect(Collectors.toList());
    }
}
