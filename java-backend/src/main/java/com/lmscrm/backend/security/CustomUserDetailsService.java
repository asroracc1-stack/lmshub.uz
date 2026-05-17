package com.lmscrm.backend.security;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(login)
                .orElseGet(() -> userRepository.findByUsername(login.toLowerCase().trim())
                        .orElseGet(() -> {
                            String phone = login.trim();
                            // Try with and without '+'
                            String phone2 = phone.startsWith("+") ? phone.substring(1) : "+" + phone;
                            return userRepository.findByPhoneNumber(phone)
                                    .orElseGet(() -> userRepository.findByPhoneNumber(phone2)
                                            .orElseThrow(() -> new UsernameNotFoundException("User not found with login: " + login)));
                        }));

        return user;
    }
}
