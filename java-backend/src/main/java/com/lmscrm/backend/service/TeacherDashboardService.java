package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.UUID;

import com.lmscrm.backend.repository.GroupTeacherRepository;

@Service
@RequiredArgsConstructor
public class TeacherDashboardService {
    private final UserRepository userRepository;
    private final GroupTeacherRepository groupTeacherRepository;

    public Object getStats(String username) {
        User teacher = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("O'qituvchi topilmadi"));

        UUID teacherId = teacher.getId();
        long groupsCount = groupTeacherRepository.countByTeacherId(teacherId);
        // Qo'shimcha stats mantiqi...
        return null; 
    }
}