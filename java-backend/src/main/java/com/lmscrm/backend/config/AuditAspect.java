package com.lmscrm.backend.config;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.Arrays;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditLogService auditLogService;

    @Pointcut("within(@org.springframework.web.bind.annotation.RestController *) && " +
            "(execution(@org.springframework.web.bind.annotation.PostMapping * *(..)) || " +
            "execution(@org.springframework.web.bind.annotation.PutMapping * *(..)) || " +
            "execution(@org.springframework.web.bind.annotation.PatchMapping * *(..)) || " +
            "execution(@org.springframework.web.bind.annotation.DeleteMapping * *(..)))")
    public void auditPointcut() {}

    @AfterReturning(pointcut = "auditPointcut()", returning = "result")
    public void logAudit(JoinPoint joinPoint, Object result) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !(auth.getPrincipal() instanceof User)) {
                return;
            }
            User user = (User) auth.getPrincipal();

            String methodName = joinPoint.getSignature().getName();
            String className = joinPoint.getTarget().getClass().getSimpleName();
            
            String action = "UNKNOWN";
            if (methodName.startsWith("create") || methodName.startsWith("post") || methodName.startsWith("save") || methodName.startsWith("add")) action = "CREATE";
            else if (methodName.startsWith("update") || methodName.startsWith("put") || methodName.startsWith("patch") || methodName.startsWith("edit")) action = "UPDATE";
            else if (methodName.startsWith("delete") || methodName.startsWith("remove")) action = "DELETE";
            else {
                // Try to guess from annotation
                if (className.contains("Controller")) {
                    if (methodName.toLowerCase().contains("login")) action = "LOGIN";
                    else if (methodName.toLowerCase().contains("logout")) action = "LOGOUT";
                }
            }

            String objectType = className.replace("Controller", "").replace("Admin", "");
            String details = "Method: " + methodName + ", Args: " + Arrays.toString(joinPoint.getArgs());
            
            auditLogService.log(action, objectType, "N/A", user, details);
        } catch (Exception e) {
            log.error("Failed to log audit", e);
        }
    }
}
