package com.lmscrm.backend.security;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.GroupTeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service("securityUtils")
@RequiredArgsConstructor
public class SecurityUtils {

    private final GroupTeacherRepository groupTeacherRepository;

    public User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        return null;
    }

    public boolean isTeacherOfGroup(UUID groupId) {
        User user = getCurrentUser();
        if (user == null) return false;

        // SuperAdmins/Admins bypass this check
        if (user.getRole().name().equals("SUPER_ADMIN") || user.getRole().name().equals("ADMIN")) {
            return true;
        }

        return groupTeacherRepository.existsByGroupIdAndTeacherId(groupId, user.getId());
    }
}
