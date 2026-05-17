package com.lmscrm.backend.service.common;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.dto.user.PasswordChangeRequest;
import com.lmscrm.backend.dto.user.ProfileUpdateRequest;
import com.lmscrm.backend.dto.user.UsernameUpdateRequest;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.ProfileRepository;
import com.lmscrm.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public void updateProfile(User principal, ProfileUpdateRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Foydalanuvchi topilmadi"));
                
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
        userRepository.save(user);

        Profile profile = profileRepository.findByUser(user)
                .orElse(Profile.builder().user(user).build());
        
        if (request.getFullName() != null && request.getFullName().contains(" ")) {
            String[] parts = request.getFullName().split(" ", 2);
            profile.setFirstName(parts[0]);
            profile.setLastName(parts[1]);
        } else {
            profile.setFirstName(request.getFullName());
        }
        profile.setPhone(request.getPhoneNumber());
        profileRepository.save(profile);
    }

    @Transactional
    public String updateUsername(User user, UsernameUpdateRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username allaqachon mavjud");
        }
        user.setUsername(request.getUsername());
        userRepository.save(user);

        // Generate new token with new username
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user, null, user.getAuthorities());
        return jwtTokenProvider.generateToken(authentication);
    }

    @Transactional
    public void changePassword(User user, PasswordChangeRequest request) {
        if (request.getCurrentPassword() == null || request.getNewPassword() == null) {
            throw new RuntimeException("Parol maydonlari bo'sh bo'lishi mumkin emas");
        }
        
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Joriy parol noto'g'ri");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
