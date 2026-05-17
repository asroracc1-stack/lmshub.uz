package com.lmscrm.backend.service.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class EskizSmsService {

    @Value("${eskiz.email:}")
    private String eskizEmail;

    @Value("${eskiz.password:}")
    private String eskizPassword;

    private String token;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendSms(String phone, String message) {
        if (eskizEmail == null || eskizEmail.isEmpty()) {
            log.warn("Eskiz credentials not provided. Simulating SMS to {}: {}", phone, message);
            return;
        }

        try {
            if (token == null) {
                login();
            }

            if (!doSendSms(phone, message)) {
                log.info("Token might be expired, refreshing...");
                login();
                doSendSms(phone, message);
            }
        } catch (Exception e) {
            log.error("Failed to send SMS via Eskiz API: {}", e.getMessage());
        }
    }

    private void login() {
        String url = "https://notify.eskiz.uz/api/auth/login";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = new HashMap<>();
        body.put("email", eskizEmail);
        body.put("password", eskizPassword);

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
                if (data != null) {
                    token = (String) data.get("token");
                    log.info("Successfully logged into Eskiz SMS API.");
                }
            }
        } catch (Exception e) {
            log.error("Eskiz Login failed: {}", e.getMessage());
        }
    }

    private boolean doSendSms(String phone, String message) {
        String url = "https://notify.eskiz.uz/api/message/sms/send";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        // Normalize phone: remove '+'
        String normalizedPhone = phone.replace("+", "").replaceAll("\\s+", "");

        Map<String, String> body = new HashMap<>();
        body.put("mobile_phone", normalizedPhone);
        body.put("message", message);
        body.put("from", "4546");

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            log.info("Eskiz SMS Response: {}", response.getBody());
            return response.getStatusCode() == HttpStatus.OK;
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized e) {
            return false; // Token expired
        } catch (Exception e) {
            log.error("Error sending SMS: {}", e.getMessage());
            return true; // Don't retry on other errors
        }
    }
}
