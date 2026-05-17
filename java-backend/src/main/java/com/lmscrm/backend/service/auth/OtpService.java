package com.lmscrm.backend.service.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final EskizSmsService smsService;
    
    // In-memory OTP storage: Phone -> OtpData
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();
    
    // In-memory Rate Limiting: Phone -> Last Sent Time
    private final Map<String, LocalDateTime> rateLimiter = new ConcurrentHashMap<>();

    private final Random random = new Random();

    public void generateAndSendOtp(String phone) {
        // Rate limiting check
        if (rateLimiter.containsKey(phone)) {
            LocalDateTime lastSent = rateLimiter.get(phone);
            if (lastSent.plusMinutes(1).isAfter(LocalDateTime.now())) {
                throw new RuntimeException("Sms qayta yuborish uchun 1 daqiqa kuting.");
            }
        }

        // RATE LIMITING VAQTINCHA O'CHIRILDI (YOKI 1 DAQIQA SAQLANADI)
        // Generate mock 6-digit OTP
        String code = "777777";
        
        // TTL 5 minutes
        otpStorage.put(phone, new OtpData(code, LocalDateTime.now().plusMinutes(5)));
        rateLimiter.put(phone, LocalDateTime.now());

        // Send SMS is MOCKED
        log.info("FIXED_CODE: {}", code);
        // String message = "LMSHub: Ro'yxatdan o'tish kodi: " + code + ". Bu kodni hech kimga bermang!";
        // smsService.sendSms(phone, message);
        
        log.info("OTP sent to {}: {}", phone, code); // Keep in log for debugging
    }

    public boolean verifyOtp(String phone, String code) {
        OtpData otpData = otpStorage.get(phone);
        if (otpData == null) {
            return false;
        }
        
        if (otpData.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpStorage.remove(phone);
            throw new RuntimeException("Kod muddati tugagan. Qaytadan so'rang.");
        }
        
        if (otpData.getCode().equals(code)) {
            otpStorage.remove(phone);
            return true;
        }
        
        return false;
    }

    @Data
    @AllArgsConstructor
    private static class OtpData {
        private String code;
        private LocalDateTime expiryTime;
    }
}
