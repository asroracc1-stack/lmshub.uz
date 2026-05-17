package com.lmscrm.backend.controller.teacher;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.academic.GroupDto;
import com.lmscrm.backend.service.academic.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/teacher/groups")
@RequiredArgsConstructor
@Tag(name = "Teacher Group Controller", description = "Endpoints for teachers to view their groups")
public class TeacherGroupController {

    private final GroupService groupService;

    @GetMapping
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Get teacher's assigned groups")
    public ResponseEntity<List<GroupDto>> getTeacherGroups(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(groupService.getTeacherGroups(currentUser.getId()));
    }
}
