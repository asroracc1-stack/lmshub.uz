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
        String cleanLogin = login;
        if (cleanLogin != null) {
            cleanLogin = cleanLogin.replace('ı', 'i').replace('İ', 'i').trim();
        } else {
            cleanLogin = "";
        }
        final String finalLogin = cleanLogin;
        User user = userRepository.findByEmailOrUsername(finalLogin, finalLogin.toLowerCase(java.util.Locale.ENGLISH))
                .orElseGet(() -> {
                    // Try with and without '+'
                    String phone2 = finalLogin.startsWith("+") ? finalLogin.substring(1) : "+" + finalLogin;
                    return userRepository.findByPhoneNumber(finalLogin)
                            .orElseGet(() -> userRepository.findByPhoneNumber(phone2)
                                    .orElseThrow(() -> new UsernameNotFoundException("User not found with login: " + login)));
                });

        return user;
    }
}
