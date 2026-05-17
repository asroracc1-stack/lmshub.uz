package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.StudentSearchResponse;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final UserRepository userRepository;

    public List<StudentSearchResponse> searchStudents(String query) {
        // Assuming UserRepository has a method to search users by full name and role
        // If not, we might need to add a custom query in UserRepository
        List<User> students = userRepository.findByRole(AppRole.STUDENT); // Get all students first

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
}
