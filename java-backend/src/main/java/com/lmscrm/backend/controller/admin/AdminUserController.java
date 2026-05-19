package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.admin.CreateUserRequest;
import com.lmscrm.backend.dto.admin.UserSummaryDto;
import com.lmscrm.backend.service.admin.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:8081"})
@Tag(name = "Admin User Controller", description = "Endpoints for Admins to manage users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    // ─── GET list (dropdown) ──────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Get user list for dropdowns")
    public ResponseEntity<List<UserSummaryDto>> getUserList(
            @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(adminUserService.getUserSummaries(organizationId, role, groupId, currentUser));
    }

    // ─── GET all (paginated) ──────────────────────────────────────────────────
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Get All Users with Pagination and Search")
    public ResponseEntity<Page<User>> getAll(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) UUID organizationId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(adminUserService.getUsers(query, organizationId, pageable, currentUser));
    }

    // ─── GET by role ──────────────────────────────────────────────────────────
    @GetMapping("/by-role/{role}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Get Users by Role with Pagination and Search")
    public ResponseEntity<Page<User>> getByRole(
            @PathVariable String role,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID organizationId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(adminUserService.getUsersByRole(role, search, organizationId, pageable, currentUser));
    }

    // ─── POST create ──────────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Create a new user (teacher, student, administrator, parent)")
    public ResponseEntity<User> create(
            @RequestBody CreateUserRequest req,
            @AuthenticationPrincipal User currentUser) {

        // Resolve names from either snake_case or camelCase
        String fullName = (req.getFull_name() != null && !req.getFull_name().isBlank())
                ? req.getFull_name()
                : req.getFullName();
        String phone = (req.getPhone_number() != null && !req.getPhone_number().isBlank())
                ? req.getPhone_number()
                : ((req.getPhoneNumber() != null && !req.getPhoneNumber().isBlank())
                        ? req.getPhoneNumber()
                        : req.getPhoneOrUsername());

        // Role parsing
        AppRole appRole;
        try {
            appRole = AppRole.valueOf(req.getRole().toUpperCase());
        } catch (Exception e) {
            appRole = AppRole.STUDENT; // default
        }

        // organizationId: use from request if superAdmin provides it, otherwise strictly from current user
        UUID orgId;
        if (currentUser.getRole() == AppRole.SUPER_ADMIN) {
            orgId = req.getOrganization_id() != null
                    ? req.getOrganization_id()
                    : (req.getOrganizationId() != null ? req.getOrganizationId() : currentUser.getOrganizationId());
        } else {
            orgId = currentUser.getOrganizationId();
        }

        String cardNumber = (req.getCard_number() != null && !req.getCard_number().isBlank())
                ? req.getCard_number()
                : req.getCardNumber();
        String cardHolder = (req.getCard_holder() != null && !req.getCard_holder().isBlank())
                ? req.getCard_holder()
                : req.getCardHolder();

        // Build the User entity from the DTO
        User user = User.builder()
                .username(req.getUsername() != null ? req.getUsername().toLowerCase().trim() : null)
                .email(req.getEmail() != null && !req.getEmail().isBlank()
                        ? req.getEmail()
                        : req.getUsername().toLowerCase().trim() + "@lms.local")
                .password(req.getPassword())
                .fullName(fullName)
                .phoneNumber(phone)
                .subject(req.getSubject())
                .role(appRole)
                .organizationId(orgId)
                .groupId(req.getGroup_id() != null ? req.getGroup_id() : req.getGroupId())
                .parentTelegramUsername(req.getParent_telegram_username())
                .cardNumber(cardNumber)
                .cardHolder(cardHolder)
                .active(true)
                .build();

        return ResponseEntity.ok(adminUserService.createUser(user));
    }

    // ─── PUT update ───────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Update User")
    public ResponseEntity<User> update(
            @PathVariable UUID id,
            @RequestBody CreateUserRequest req,
            @AuthenticationPrincipal User currentUser) {

        String fullName = (req.getFull_name() != null && !req.getFull_name().isBlank())
                ? req.getFull_name()
                : req.getFullName();
        String phone = (req.getPhone_number() != null && !req.getPhone_number().isBlank())
                ? req.getPhone_number()
                : ((req.getPhoneNumber() != null && !req.getPhoneNumber().isBlank())
                        ? req.getPhoneNumber()
                        : req.getPhoneOrUsername());

        // Role parsing
        AppRole appRole = null;
        if (req.getRole() != null) {
            try {
                appRole = AppRole.valueOf(req.getRole().toUpperCase());
            } catch (Exception ignore) {}
        }

        // organizationId: use from request if superAdmin provides it, otherwise keep unchanged
        UUID orgId = null;
        if (currentUser.getRole() == AppRole.SUPER_ADMIN) {
            orgId = req.getOrganization_id() != null
                    ? req.getOrganization_id()
                    : (req.getOrganizationId() != null ? req.getOrganizationId() : null);
        }

        String cardNumber = (req.getCard_number() != null && !req.getCard_number().isBlank())
                ? req.getCard_number()
                : req.getCardNumber();
        String cardHolder = (req.getCard_holder() != null && !req.getCard_holder().isBlank())
                ? req.getCard_holder()
                : req.getCardHolder();

        User details = User.builder()
                .username(req.getUsername())
                .fullName(fullName)
                .email(req.getEmail())
                .phoneNumber(phone)
                .subject(req.getSubject())
                .parentTelegramUsername(req.getParent_telegram_username())
                .groupId(req.getGroup_id() != null ? req.getGroup_id() : req.getGroupId())
                .role(appRole)
                .organizationId(orgId)
                .cardNumber(cardNumber)
                .cardHolder(cardHolder)
                .active(true)
                .build();

        return ResponseEntity.ok(adminUserService.updateUser(id, details, currentUser));
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Delete User")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {
        adminUserService.deleteUser(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ─── PATCH / POST password reset (accept both HTTP methods for compatibility)
    @PatchMapping("/{id}/password")
    @PostMapping("/{id}/password")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Reset Password")
    public ResponseEntity<Void> resetPassword(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String newPassword = body.getOrDefault("password", body.get("newPassword"));
        adminUserService.resetPassword(id, newPassword, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ─── PATCH toggle active ──────────────────────────────────────────────────
    @PatchMapping("/{id}/active")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Toggle User Active Status")
    public ResponseEntity<Void> toggleActive(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal User currentUser) {
        adminUserService.toggleActive(id, body.get("active"), currentUser);
        return ResponseEntity.noContent().build();
    }

    // ─── POST auto-create parent ──────────────────────────────────────────────
    @PostMapping("/parents/auto-create")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','ADMINISTRATOR','TEACHER')")
    @Operation(summary = "Automatically create parent and link to student")
    public ResponseEntity<User> autoCreateParent(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        UUID studentId = UUID.fromString(body.get("studentId"));
        String phoneNumber = body.get("phoneNumber");
        String telegramUsername = body.get("telegramUsername");
        return ResponseEntity.ok(adminUserService.createParentAuto(studentId, phoneNumber, telegramUsername, currentUser));
    }
}

