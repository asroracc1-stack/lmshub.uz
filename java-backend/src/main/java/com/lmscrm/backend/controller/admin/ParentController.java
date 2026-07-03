package com.lmscrm.backend.controller.admin;

import com.lmscrm.backend.domain.entity.ParentStudentLink;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.repository.ParentStudentLinkRepository;
import com.lmscrm.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/parents")
@RequiredArgsConstructor
@Tag(name = "Parent Controller", description = "Ota-onalarni boshqarish endpointlari")
public class ParentController {

    private final UserRepository userRepository;
    private final ParentStudentLinkRepository linkRepository;
    private final PasswordEncoder passwordEncoder;

    // ─── GET all parents (paginated) ─────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR', 'TEACHER')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Operation(summary = "Get all parents with pagination")
    public ResponseEntity<Page<ParentDto>> getAll(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {

        boolean isSuper = currentUser.getRole() == AppRole.SUPER_ADMIN;
        UUID orgId = currentUser.getOrganizationId();

        Page<User> parents;
        if (isSuper) {
            parents = (query != null && !query.isBlank())
                    ? userRepository.searchUsers(query, pageable).map(u -> u)
                    : userRepository.findByRole(AppRole.PARENT, pageable);
        } else {
            parents = (query != null && !query.isBlank())
                    ? userRepository.searchUsersInOrganization(query, orgId, pageable)
                    : userRepository.findByRoleAndOrganizationId(AppRole.PARENT, orgId, pageable);
        }

        Page<ParentDto> result = parents.map(this::toDto);
        return ResponseEntity.ok(result);
    }

    // ─── GET children of a parent ─────────────────────────────────────────────
    @GetMapping("/{parentId}/children")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR', 'TEACHER', 'PARENT')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Operation(summary = "Get children linked to a parent")
    public ResponseEntity<List<ChildDto>> getChildren(@PathVariable UUID parentId) {
        List<ParentStudentLink> links = linkRepository.findAllByParentId(parentId);
        List<ChildDto> children = links.stream()
                .filter(l -> l != null && l.getStudent() != null)
                .map(l -> ChildDto.from(l.getStudent()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(children);
    }

    // ─── GET my children (for PARENT role) ───────────────────────────────────
    @GetMapping("/my-children")
    @PreAuthorize("hasRole('PARENT')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Operation(summary = "Get my children (self)")
    public ResponseEntity<List<ChildDto>> getMyChildren(@AuthenticationPrincipal User currentUser) {
        List<ParentStudentLink> links = linkRepository.findAllByParentId(currentUser.getId());
        List<ChildDto> children = links.stream()
                .filter(l -> l != null && l.getStudent() != null)
                .map(l -> ChildDto.from(l.getStudent()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(children);
    }

    // ─── POST create parent ───────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR', 'TEACHER')")
    @Operation(summary = "Create a new parent user")
    public ResponseEntity<User> create(@RequestBody CreateParentRequest req,
                                       @AuthenticationPrincipal User currentUser) {

        User student = null;
        if (req.getStudentId() != null && !req.getStudentId().isBlank()) {
            try {
                student = userRepository.findById(UUID.fromString(req.getStudentId())).orElse(null);
            } catch (IllegalArgumentException ignore) {}
        }

        // Get phone number
        String phone = req.getPhone() != null && !req.getPhone().isBlank()
                ? req.getPhone()
                : (req.getPhoneOrUsername() != null ? req.getPhoneOrUsername() : "");

        // Determine username
        String finalUsername = null;
        if (student != null) {
            String[] nameParts = student.getFullName() != null ? student.getFullName().split(" ") : new String[]{student.getUsername()};
            String firstNamePart = nameParts[0].length() >= 3 ? nameParts[0].substring(0, 3).toLowerCase() : nameParts[0].toLowerCase();
            String lastNamePart = nameParts.length > 1 && nameParts[1].length() >= 3 ? nameParts[1].substring(0, 3).toLowerCase() : "";
            finalUsername = firstNamePart + lastNamePart + "_parent";
        } else if (req.getFullName() != null && !req.getFullName().isBlank()) {
            String cleanName = req.getFullName().toLowerCase()
                    .replaceAll("[^a-z0-9]", "")
                    .trim();
            finalUsername = cleanName.isEmpty() ? "parent" : cleanName + "_parent";
        } else {
            finalUsername = "parent_" + (System.currentTimeMillis() % 100000);
        }

        // Ensure username is unique
        String baseUsername = finalUsername;
        int count = 1;
        while(userRepository.findByUsername(finalUsername).isPresent()) {
            finalUsername = baseUsername + count;
            count++;
        }

        // Determine password
        String generatedPassword = null;
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            generatedPassword = req.getPassword();
        } else if (student != null) {
            generatedPassword = student.getId().toString().substring(0, 8);
        } else {
            generatedPassword = "Parent@123";
        }

        // Determine email
        String email = req.getEmail() != null && !req.getEmail().isBlank()
                ? req.getEmail()
                : finalUsername + "@parent.lms";

        // Organization ID
        UUID orgId = null;
        if (currentUser.getRole() == AppRole.SUPER_ADMIN) {
            if (req.getOrganizationId() != null && !req.getOrganizationId().isBlank()) {
                try {
                    orgId = UUID.fromString(req.getOrganizationId());
                } catch (IllegalArgumentException ignore) {}
            }
        }
        if (orgId == null && currentUser != null) {
            orgId = currentUser.getOrganizationId();
        }

        // Check if parent already exists by phone
        User parent = null;
        if (!phone.isBlank()) {
            parent = userRepository.findByPhoneNumber(phone).orElse(null);
        }

        if (parent == null) {
            parent = User.builder()
                    .fullName(req.getFullName() != null && !req.getFullName().isBlank() 
                            ? req.getFullName() 
                            : (student != null ? student.getFullName() + " ning ota-onasi" : "Ota-ona"))
                    .username(finalUsername)
                    .email(email)
                    .password(passwordEncoder.encode(generatedPassword))
                    .phoneNumber(phone)
                    .telegramUsername(req.getTelegramUsername())
                    .role(AppRole.PARENT)
                    .organizationId(orgId)
                    .active(true)
                    .build();
            parent = userRepository.save(parent);
        } else {
            // Update telegram username or fullName if provided
            boolean changed = false;
            if (req.getTelegramUsername() != null && !req.getTelegramUsername().isBlank()) {
                parent.setTelegramUsername(req.getTelegramUsername());
                changed = true;
            }
            if (req.getFullName() != null && !req.getFullName().isBlank()) {
                parent.setFullName(req.getFullName());
                changed = true;
            }
            if (email != null && !email.isBlank() && (parent.getEmail() == null || parent.getEmail().endsWith("@parent.lms"))) {
                parent.setEmail(email);
                changed = true;
            }
            if (changed) {
                userRepository.save(parent);
            }
        }

        // Link to student if student is present
        if (student != null) {
            boolean exists = linkRepository.existsByParentIdAndStudentId(parent.getId(), student.getId());
            if (!exists) {
                ParentStudentLink link = ParentStudentLink.builder()
                        .parent(parent)
                        .student(student)
                        .relationship(req.getRelationship() != null ? req.getRelationship() : "OTA-ONA")
                        .build();
                linkRepository.save(link);
            }
        }

        User responseUser = parent;
        responseUser.setCardNumber(generatedPassword); // Using unused field temporarily to send back the generated password to frontend

        return ResponseEntity.ok(responseUser);
    }

    // ─── POST link child to existing parent ──────────────────────────────────
    @PostMapping("/{parentId}/link-child/{studentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR', 'TEACHER')")
    @Operation(summary = "Link a student to a parent")
    public ResponseEntity<Void> linkChild(@PathVariable UUID parentId,
                                          @PathVariable UUID studentId) {
        User parent = userRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Ota-ona topilmadi"));
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Talaba topilmadi"));

        if (!linkRepository.existsByParentIdAndStudentId(parentId, studentId)) {
            linkRepository.save(ParentStudentLink.builder()
                    .parent(parent)
                    .student(student)
                    .relationship("OTA-ONA")
                    .build());
        }

        // Apply automation rules to update the parent's credentials and details
        // 1. Username generation: First 3 letters of student's first name + First 3 letters of student's last name + _parent
        String[] nameParts = student.getFullName() != null ? student.getFullName().split(" ") : new String[]{student.getUsername()};
        String firstNamePart = nameParts[0].length() >= 3 ? nameParts[0].substring(0, 3).toLowerCase() : nameParts[0].toLowerCase();
        String lastNamePart = nameParts.length > 1 && nameParts[1].length() >= 3 ? nameParts[1].substring(0, 3).toLowerCase() : "";
        String generatedUsername = firstNamePart + lastNamePart + "_parent";

        // Ensure username uniqueness
        String finalUsername = generatedUsername;
        int count = 1;
        while (userRepository.findByUsername(finalUsername).isPresent()) {
            User existing = userRepository.findByUsername(finalUsername).get();
            if (existing.getId().equals(parent.getId())) {
                break;
            }
            finalUsername = generatedUsername + count;
            count++;
        }

        parent.setUsername(finalUsername);

        // 2. Password generation: First 8 characters of student UUID
        String generatedPassword = student.getId().toString().substring(0, 8);
        parent.setPassword(passwordEncoder.encode(generatedPassword));

        // 3. Full name: If parent's full name is blank or default "Ota-ona", set it to "Student FullName ning ota-onasi"
        if (parent.getFullName() == null || parent.getFullName().isBlank() || parent.getFullName().equalsIgnoreCase("Ota-ona")) {
            parent.setFullName(student.getFullName() + " ning ota-onasi");
        }

        userRepository.save(parent);

        return ResponseEntity.ok().build();
    }

    // ─── PUT update parent ───────────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR', 'TEACHER')")
    @Operation(summary = "Update a parent user")
    public ResponseEntity<User> updateParent(@PathVariable UUID id,
                                             @RequestBody CreateParentRequest req,
                                             @AuthenticationPrincipal User currentUser) {
        User parent = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ota-ona topilmadi"));

        // Security check: must belong to same organization if not SUPER_ADMIN
        if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
            if (parent.getOrganizationId() == null || !parent.getOrganizationId().equals(currentUser.getOrganizationId())) {
                throw new RuntimeException("Ruxsat etilmagan harakat!");
            }
        }

        // Update fields
        if (req.getFullName() != null && !req.getFullName().isBlank()) {
            parent.setFullName(req.getFullName());
        }
        String phone = req.getPhone() != null && !req.getPhone().isBlank()
                ? req.getPhone()
                : (req.getPhoneOrUsername() != null ? req.getPhoneOrUsername() : "");
        if (!phone.isBlank()) {
            parent.setPhoneNumber(phone);
        }
        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            parent.setEmail(req.getEmail());
        }
        if (req.getTelegramUsername() != null) {
            parent.setTelegramUsername(req.getTelegramUsername().replace("@", ""));
        }

        User saved = userRepository.save(parent);
        return ResponseEntity.ok(saved);
    }

    // ─── DELETE unlink child ──────────────────────────────────────────────────
    @DeleteMapping("/{parentId}/unlink-child/{studentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR', 'TEACHER')")
    @Operation(summary = "Unlink a student from a parent")
    public ResponseEntity<Void> unlinkChild(@PathVariable UUID parentId,
                                             @PathVariable UUID studentId) {
        linkRepository.findAllByParentId(parentId).stream()
                .filter(l -> l.getStudent().getId().equals(studentId))
                .forEach(linkRepository::delete);
        return ResponseEntity.noContent().build();
    }

    // ─── DELETE parent ────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR', 'TEACHER')")
    @Operation(summary = "Delete a parent user")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        // Remove all links first
        linkRepository.findAllByParentId(id).forEach(linkRepository::delete);
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    private ParentDto toDto(User u) {
        List<ParentStudentLink> links = linkRepository.findAllByParentId(u.getId());
        List<String> childrenNames = links.stream()
                .filter(l -> l != null && l.getStudent() != null)
                .map(l -> l.getStudent().getFullName() != null
                        ? l.getStudent().getFullName() : l.getStudent().getUsername())
                .collect(Collectors.toList());
        List<ChildDto> children = links.stream()
                .filter(l -> l != null && l.getStudent() != null)
                .map(l -> ChildDto.from(l.getStudent()))
                .collect(Collectors.toList());
        return new ParentDto(u.getId(), u.getFullName(), u.getUsername(),
                u.getEmail(), u.getPhoneNumber(), u.isActive(),
                u.getCreatedAt(), childrenNames, children);
    }

    // ─── DTOs ─────────────────────────────────────────────────────────────────
    @lombok.Data @lombok.AllArgsConstructor @lombok.NoArgsConstructor
    public static class ParentDto {
        private UUID id;
        private String fullName;
        private String username;
        private String email;
        private String phoneNumber;
        private boolean active;
        private java.time.LocalDateTime createdAt;
        private List<String> childrenNames;
        private List<ChildDto> children;
    }

    @lombok.Data
    public static class ChildDto {
        private UUID id;
        private String fullName;
        private String username;
        private String avatarUrl;
        private Long coins;
        private UUID organizationId;

        public static ChildDto from(User u) {
            ChildDto d = new ChildDto();
            d.id = u.getId();
            d.fullName = u.getFullName();
            d.username = u.getUsername();
            d.avatarUrl = u.getAvatarUrl();
            d.coins = u.getCoins();
            d.organizationId = u.getOrganizationId();
            return d;
        }
    }

    @Data
    public static class CreateParentRequest {
        private String studentId;
        private String phone;
        private String phoneOrUsername; // For frontend compatibility in Parents.tsx
        private String telegramUsername;
        private String fullName;
        private String email;           // For frontend compatibility in Parents.tsx
        private String password;        // For frontend compatibility in Parents.tsx
        private String organizationId;  // Using String for safer deserialization
        private String relationship;
    }
}
