package com.lmscrm.backend.controller.teacher;

import com.lmscrm.backend.domain.entity.Group;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.GroupRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.LessonRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/teacher/dashboard")
@RequiredArgsConstructor
@Tag(name = "Teacher Dashboard Controller", description = "Endpoints for teachers to view their dashboard statistics")
public class TeacherDashboardController {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get teacher dashboard summary")
    public ResponseEntity<Map<String, Object>> getSummary(@AuthenticationPrincipal User currentUser) {
        List<Group> teacherGroups = groupRepository.findByTeacherId(currentUser.getId());
        long groupsCount = teacherGroups.size();
        
        long studentsCount = teacherGroups.stream()
                .mapToLong(g -> userRepository.countByGroupId(g.getId()))
                .sum();
                
        long lessonsCount = lessonRepository.countByTeacherId(currentUser.getId());
        
        Map<String, Object> summary = new HashMap<>();
        summary.put("myGroupsCount", groupsCount);
        summary.put("myStudentsCount", studentsCount);
        summary.put("myLessonsCount", lessonsCount);
        
        return ResponseEntity.ok(summary);
    }
}
