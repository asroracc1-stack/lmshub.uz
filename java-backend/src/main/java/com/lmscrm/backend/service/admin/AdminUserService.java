package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.ParentStudentLink;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.repository.ParentStudentLinkRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.lmscrm.backend.dto.admin.UserSummaryDto;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ParentStudentLinkRepository parentStudentLinkRepository;

    public Page<User> getUsers(String query, UUID organizationId, Pageable pageable, User currentUser) {
        boolean isSuper = currentUser.getRole() == AppRole.SUPER_ADMIN;
        UUID orgId = isSuper && organizationId != null ? organizationId : (isSuper ? null : currentUser.getOrganizationId());

        if (query != null && !query.isEmpty()) {
            if (orgId == null) return userRepository.searchUsers(query, pageable);
            return userRepository.searchUsersInOrganization(query, orgId, pageable);
        }
        
        if (orgId == null) return userRepository.findAll(pageable);
        return userRepository.findByOrganizationId(orgId, pageable);
    }

    public List<UserSummaryDto> getUserSummaries(UUID organizationId, String roleName, UUID groupId, User currentUser) {
        boolean isSuper = currentUser.getRole() == AppRole.SUPER_ADMIN;
        UUID effectiveOrgId = isSuper ? organizationId : currentUser.getOrganizationId();
        
        AppRole role = null;
        if (roleName != null && !roleName.equalsIgnoreCase("all")) {
            try {
                role = AppRole.valueOf(roleName.toUpperCase());
            } catch (Exception ignore) {}
        }

        List<User> users;
        if (groupId != null) {
            if (role != null) {
                users = userRepository.findByRoleAndGroupId(role, groupId);
            } else {
                users = userRepository.findByGroupId(groupId);
            }
        } else if (effectiveOrgId != null) {
            if (role != null) {
                users = userRepository.findByRoleAndOrganizationId(role, effectiveOrgId);
            } else {
                users = userRepository.findByOrganizationId(effectiveOrgId);
            }
        } else {
            if (role != null) {
                users = userRepository.findByRole(role);
            } else {
                users = userRepository.findAll();
            }
        }
        return users.stream().map(u -> UserSummaryDto.builder()
                .id(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .username(u.getUsername())
                .organizationId(u.getOrganizationId())
                .build()).collect(Collectors.toList());
    }

    public Page<User> getUsersByRole(String roleName, String search, UUID organizationId, Pageable pageable, User currentUser) {
        boolean isSuper = currentUser.getRole() == AppRole.SUPER_ADMIN;
        UUID orgId = isSuper && organizationId != null ? organizationId : (isSuper ? null : currentUser.getOrganizationId());

        AppRole role = null;
        if (roleName != null && !roleName.equalsIgnoreCase("all")) {
            try {
                role = AppRole.valueOf(roleName.toUpperCase());
            } catch (Exception ignore) {}
        }

        boolean hasSearch = search != null && !search.trim().isEmpty();

        if (role == null) {
            if (hasSearch) {
                if (orgId == null) return userRepository.searchUsers(search.trim(), pageable);
                return userRepository.searchUsersInOrganization(search.trim(), orgId, pageable);
            }
            if (orgId == null) return userRepository.findAll(pageable);
            return userRepository.findByOrganizationId(orgId, pageable);
        }
        
        try {
            if (hasSearch) {
                if (orgId == null) return userRepository.searchByRoleAndQuery(role, search.trim(), pageable);
                return userRepository.searchByRoleAndOrganizationAndQuery(role, orgId, search.trim(), pageable);
            }
            if (orgId == null) return userRepository.findByRole(role, pageable);
            return userRepository.findByRoleAndOrganizationId(role, orgId, pageable);
        } catch (IllegalArgumentException e) {
            return Page.empty(pageable);
        }
    }

    public User createUser(User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            throw new RuntimeException("Username cannot be empty");
        }
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new com.lmscrm.backend.exception.BusinessException("Bu username allaqachon band: " + user.getUsername());
        }
        // Only check email uniqueness if it's a real user-provided email (not auto-generated)
        String email = user.getEmail();
        boolean isAutoEmail = email != null && email.endsWith("@lms.local");
        if (!isAutoEmail && email != null && !email.isBlank() && userRepository.existsByEmail(email)) {
            throw new com.lmscrm.backend.exception.BusinessException("Bu email allaqachon ro'yxatdan o'tgan: " + email);
        }
        // If auto-generated email conflicts, make it unique
        if (isAutoEmail && userRepository.existsByEmail(email)) {
            user.setEmail(user.getUsername() + "_" + System.currentTimeMillis() + "@lms.local");
        }
        // Org check for all non-superadmin roles
        if (user.getOrganizationId() == null &&
                (user.getRole() == AppRole.TEACHER || user.getRole() == AppRole.STUDENT
                || user.getRole() == AppRole.ADMINISTRATOR || user.getRole() == AppRole.PARENT)) {
            throw new RuntimeException(user.getRole() + " tashkilotga biriktirilishi shart");
        }
        if (user.getRole() == AppRole.ADMIN || user.getRole() == AppRole.ADMINISTRATOR) {
            if (user.getCardNumber() == null || user.getCardNumber().trim().isEmpty() ||
                user.getCardHolder() == null || user.getCardHolder().trim().isEmpty()) {
                throw new com.lmscrm.backend.exception.BusinessException("Admin va Administratorlar uchun karta raqami (card_number) va karta egasining ismi (card_holder) kiritilishi majburiy!");
            }
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public User updateUser(UUID id, User details, User currentUser) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Security check
        if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
            // Non-super_admins cannot update users who are already privileged roles
            if (user.getRole() == AppRole.SUPER_ADMIN || 
                user.getRole() == AppRole.PAYMENT_MANAGER || 
                user.getRole() == AppRole.PACK_MANAGER || 
                user.getRole() == AppRole.MANAGER) {
                throw new RuntimeException("Ruxsat etilmagan harakat: Ushbu foydalanuvchini faqat Super Admin tahrirlashi mumkin!");
            }
            if (!java.util.Objects.equals(user.getOrganizationId(), currentUser.getOrganizationId())) {
                throw new RuntimeException("Ruxsat etilmagan harakat!");
            }
        }

        // Logic for auto-generated parent usernames when updating a parent
        if (user.getRole() == AppRole.PARENT) {
            // Find linked student
            List<ParentStudentLink> links = parentStudentLinkRepository.findAllByParentId(user.getId());
            if (!links.isEmpty()) {
                User student = links.get(0).getStudent();
                String targetUsername = generatePremiumParentUsername(student.getFullName());
                // Only change if needed and if it's not conflicting with another user
                if (!targetUsername.equals(user.getUsername())) {
                    Optional<User> existing = userRepository.findByUsername(targetUsername);
                    if (existing.isEmpty() || existing.get().getId().equals(id)) {
                        user.setUsername(targetUsername);
                        details.setUsername(targetUsername);
                    }
                }
            }
        }

        if (details.getUsername() == null || details.getUsername().trim().isEmpty()) {
            throw new RuntimeException("Username cannot be empty");
        }

        // Check if the username being requested already exists and belongs to a DIFFERENT user
        Optional<User> existingUserByUsername = userRepository.findByUsername(details.getUsername());
        if (existingUserByUsername.isPresent() && !existingUserByUsername.get().getId().equals(id)) {
             throw new com.lmscrm.backend.exception.BusinessException("Bu username allaqachon band!");
        }

        if (details.getEmail() != null && !details.getEmail().isBlank()) {
            Optional<User> existingUserByEmail = userRepository.findByEmail(details.getEmail());
            if (existingUserByEmail.isPresent() && !existingUserByEmail.get().getId().equals(id)) {
                throw new com.lmscrm.backend.exception.BusinessException("Bu email allaqachon ro'yxatdan o'tgan!");
            }
        }

        if (details.getUsername() != null && !details.getUsername().isBlank()) {
            user.setUsername(details.getUsername());
        }
        if (details.getEmail() != null && !details.getEmail().isBlank()) {
            user.setEmail(details.getEmail());
        }
        if (details.getFullName() != null) {
            user.setFullName(details.getFullName());
        }
        if (details.getPhoneNumber() != null) {
            user.setPhoneNumber(details.getPhoneNumber());
        }
        
        // Prevent non-super-admins from changing organization
        if (currentUser.getRole() == AppRole.SUPER_ADMIN && details.getOrganizationId() != null) {
            user.setOrganizationId(details.getOrganizationId());
        }
        
        user.setGroupId(details.getGroupId());
        if (details.getSubject() != null) user.setSubject(details.getSubject());
        if (details.getRole() != null) {
            if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
                if (details.getRole() == AppRole.SUPER_ADMIN || 
                    details.getRole() == AppRole.PAYMENT_MANAGER || 
                    details.getRole() == AppRole.PACK_MANAGER || 
                    details.getRole() == AppRole.MANAGER) {
                    throw new RuntimeException("Ruxsat etilmagan harakat: Faqat Super Admin ushbu rolni biriktirishi mumkin!");
                }
            }
            user.setRole(details.getRole());
        }
        if (details.getTelegramChatId() != null) user.setTelegramChatId(details.getTelegramChatId());
        if (details.getTelegramUsername() != null) user.setTelegramUsername(details.getTelegramUsername());
        if (details.getParentTelegramUsername() != null) user.setParentTelegramUsername(details.getParentTelegramUsername());
        if (details.getCardNumber() != null) user.setCardNumber(details.getCardNumber());
        if (details.getCardHolder() != null) user.setCardHolder(details.getCardHolder());
        
        if (user.getRole() == AppRole.ADMIN || user.getRole() == AppRole.ADMINISTRATOR) {
            if (user.getCardNumber() == null || user.getCardNumber().trim().isEmpty() ||
                user.getCardHolder() == null || user.getCardHolder().trim().isEmpty()) {
                throw new com.lmscrm.backend.exception.BusinessException("Admin va Administratorlar uchun karta raqami (card_number) va karta egasining ismi (card_holder) kiritilishi majburiy!");
            }
        }

        // Only update active status if it's explicitly provided (though builder default is true)
        // Here we assume if it's in details, we take it.
        user.setActive(details.isActive());
        
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(UUID id, User currentUser) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new com.lmscrm.backend.exception.BusinessException("User not found"));
        
        if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
            if (user.getRole() == AppRole.SUPER_ADMIN || 
                user.getRole() == AppRole.PAYMENT_MANAGER || 
                user.getRole() == AppRole.PACK_MANAGER || 
                user.getRole() == AppRole.MANAGER) {
                throw new RuntimeException("Ruxsat etilmagan harakat: Ushbu foydalanuvchini faqat Super Admin o'chira oladi!");
            }
            if (!java.util.Objects.equals(user.getOrganizationId(), currentUser.getOrganizationId())) {
                throw new RuntimeException("Ruxsat etilmagan harakat!");
            }
        }

        // Avvalo barcha bog'liqliklarni uzish kerak (Masalan ota-onani o'chirishda linklari bor bo'lishi mumkin)
        if (user.getRole() == AppRole.PARENT) {
            List<ParentStudentLink> links = parentStudentLinkRepository.findAllByParentId(id);
            parentStudentLinkRepository.deleteAll(links);
        } else if (user.getRole() == AppRole.STUDENT) {
            List<ParentStudentLink> links = parentStudentLinkRepository.findAllByStudentId(id);
            parentStudentLinkRepository.deleteAll(links);
        }

        try {
            userRepository.delete(user);
            userRepository.flush(); // To force the exception if there's a constraint violation
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new com.lmscrm.backend.exception.BusinessException("Bu foydalanuvchida test natijalari, to'lovlar yoki boshqa bog'liq ma'lumotlar mavjud bo'lganligi sababli, uni tizimdan butunlay o'chirib bo'lmaydi. Iltimos, uning o'rniga foydalanuvchini 'Faol emas' holatiga o'tkazing.");
        }
    }

    public void resetPassword(UUID id, String newPassword, User currentUser) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new com.lmscrm.backend.exception.BusinessException("User not found"));
        
        if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
            if (user.getRole() == AppRole.SUPER_ADMIN || 
                user.getRole() == AppRole.PAYMENT_MANAGER || 
                user.getRole() == AppRole.PACK_MANAGER || 
                user.getRole() == AppRole.MANAGER) {
                throw new RuntimeException("Ruxsat etilmagan harakat: Parolni faqat Super Admin o'zgartira oladi!");
            }
            if (!java.util.Objects.equals(user.getOrganizationId(), currentUser.getOrganizationId())) {
                throw new RuntimeException("Ruxsat etilmagan harakat!");
            }
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void toggleActive(UUID id, boolean active, User currentUser) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new com.lmscrm.backend.exception.BusinessException("Foydalanuvchi topilmadi"));
        
        if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
            if (user.getRole() == AppRole.SUPER_ADMIN || 
                user.getRole() == AppRole.PAYMENT_MANAGER || 
                user.getRole() == AppRole.PACK_MANAGER || 
                user.getRole() == AppRole.MANAGER) {
                throw new RuntimeException("Ruxsat etilmagan harakat: Ushbu foydalanuvchi holatini faqat Super Admin o'zgartira oladi!");
            }
            if (!java.util.Objects.equals(user.getOrganizationId(), currentUser.getOrganizationId())) {
                throw new RuntimeException("Ruxsat etilmagan harakat!");
            }
        }
        user.setActive(active);
        userRepository.save(user);
    }

    @Transactional
    public User createParentAuto(UUID studentId, String phoneNumber, String telegramUsername, User currentUser) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new com.lmscrm.backend.exception.ResourceNotFoundException("Talaba topilmadi"));

        // Security check
        if (currentUser.getRole() != AppRole.SUPER_ADMIN) {
            if (!java.util.Objects.equals(student.getOrganizationId(), currentUser.getOrganizationId())) {
                throw new RuntimeException("Ushbu talabaga ota-ona biriktirish uchun ruxsat yo'q!");
            }
        }

        // Formula for username: jasabd_parent (3 chars of name + 3 chars of surname + _parent)
        String username = generatePremiumParentUsername(student.getFullName());

        // Formula for password: child UUID first 8 chars
        String rawPassword = student.getId().toString().substring(0, 8);

        User parent = User.builder()
                .username(username)
                .fullName("Ota-ona: " + student.getFullName())
                .phoneNumber(phoneNumber)
                .telegramUsername(telegramUsername)
                .role(AppRole.PARENT)
                .organizationId(student.getOrganizationId())
                .password(passwordEncoder.encode(rawPassword))
                .email(username + "@lms.local")
                .active(true)
                .build();

        User savedParent = userRepository.save(parent);

        // Link them
        ParentStudentLink link = ParentStudentLink.builder()
                .parent(savedParent)
                .student(student)
                .relationship("PARENT")
                .build();
        parentStudentLinkRepository.save(link);

        return savedParent;
    }

    private String generatePremiumParentUsername(String fullName) {
        if (fullName == null || fullName.isBlank()) return "p_" + UUID.randomUUID().toString().substring(0, 6);
        
        String[] parts = fullName.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        
        if (parts.length >= 1) {
            String firstName = parts[0].toLowerCase().replaceAll("[^a-z]", "");
            sb.append(firstName.substring(0, Math.min(firstName.length(), 3)));
        }
        
        if (parts.length >= 2) {
            String lastName = parts[1].toLowerCase().replaceAll("[^a-z]", "");
            sb.append(lastName.substring(0, Math.min(lastName.length(), 3)));
        } else if (parts.length == 1) {
            sb.append("usr"); // Fallback if only one name part exists
        }
        
        sb.append("_parent");
        String base = sb.toString();
        
        if (!userRepository.existsByUsername(base)) return base;
        
        // If exists, add unique suffix
        return base + "_" + (int)(Math.random() * 900 + 100);
}

}
