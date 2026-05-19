package com.lmscrm.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;


@Slf4j
@Service
public class GeminiService {

    @Value("${gemini.api.keys:}")
    private String geminiApiKeys;

    @Value("${gemini.api.key:}")
    private String geminiApiKeySingular;

    private final List<String> apiKeysList = new ArrayList<>();
    private final Map<String, Long> keyCooldowns = new ConcurrentHashMap<>();
    private int currentKeyIndex = 0;

    @PostConstruct
    public void init() {
        Set<String> keys = new LinkedHashSet<>();
        if (geminiApiKeys != null && !geminiApiKeys.trim().isEmpty()) {
            for (String k : geminiApiKeys.split(",")) {
                String trimmed = k.trim();
                if (!trimmed.isEmpty() && !trimmed.contains("your-gemini-keys") && !trimmed.contains("your-gemini-key")) {
                    keys.add(trimmed);
                }
            }
        }
        if (geminiApiKeySingular != null && !geminiApiKeySingular.trim().isEmpty() 
                && !geminiApiKeySingular.equals("your-gemini-key")) {
            keys.add(geminiApiKeySingular.trim());
        }

        apiKeysList.clear();
        apiKeysList.addAll(keys);

        if (apiKeysList.isEmpty()) {
            log.warn("CRITICAL: Yaroqli Gemini API kalitlari topilmadi (placeholder kalitlar hisobga olinmadi)!");
        } else {
            log.info("Gemini Service yuklandi. {} ta haqiqiy va yaroqli kalit aniqlandi.", apiKeysList.size());
        }
    }

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }

    private synchronized String getValidKey() {
        long now = System.currentTimeMillis();
        for (int i = 0; i < apiKeysList.size(); i++) {
            String key = apiKeysList.get(currentKeyIndex);
            Long cooldownUntil = keyCooldowns.get(key);
            
            if (cooldownUntil == null || now > cooldownUntil) {
                keyCooldowns.remove(key); // Clear expired cooldown
                // Return this key but advance index for next time (fair rotation)
                currentKeyIndex = (currentKeyIndex + 1) % apiKeysList.size();
                return key;
            }
            
            // Current key is on cooldown, try next one
            currentKeyIndex = (currentKeyIndex + 1) % apiKeysList.size();
        }
        return null; // All keys are on cooldown
    }

    private void markKeyAsLimited(String key, int retryAfterSeconds) {
        long cooldownTime = System.currentTimeMillis() + (retryAfterSeconds * 1000L);
        keyCooldowns.put(key, cooldownTime);
        log.warn("Key {} limitga tushdi. {} soniya kutish kerak.", 
            key.substring(Math.max(0, key.length() - 4)), retryAfterSeconds);
    }

    public String analyzeIeltsMockText(String text) {
        return analyzeIeltsMockWithImages(text, null);
    }

    public String analyzeIeltsMockWithImages(String text, List<String> uploadedImageUrls) {
        if (apiKeysList.isEmpty()) {
            throw new RuntimeException("Tizim sozlamalarida xatolik: Yaroqli Gemini API kaliti (GEMINI_API_KEY) topilmadi. Iltimos, application.properties faylidagi 'gemini.api.key' qismiga haqiqiy kalitingizni kiriting!");
        }

        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Tahlil uchun matn berilmagan");
        }

        String cleanedText = cleanHtml(text);
        boolean isListening = cleanedText.toLowerCase().contains("transcription") || 
                             cleanedText.toLowerCase().contains("audio");

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("You are an expert IELTS examiner. Analyze the following ").append(isListening ? "LISTENING" : "READING").append(" text.\n")
                .append("Output ONLY raw JSON root: {\"sections\": [...]}\n")
                .append("Each section: {\"title\": \"...\", \"passage\": \"...\", \"imageUrl\": \"...\", \"questions\": [...]}\n")
                .append("Each question: {\"prompt\": \"...\", \"qtype\": \"mcq|fill|short|tfng|ynng\", \"options\": [...], \"correct_answer\": \"...\", \"points\": 1}\n");

        if (uploadedImageUrls != null && !uploadedImageUrls.isEmpty()) {
            promptBuilder.append("\nAVAILABLE IMAGE URLS for mapping:\n");
            for (String url : uploadedImageUrls) promptBuilder.append("- ").append(url).append("\n");
        }

        promptBuilder.append("\nText to analyze:\n").append(cleanedText);
        return executeWithRotation(promptBuilder.toString(), 3);
    }

    public String executeWithRotation(String prompt, int maxOverallRetries) {
        for (int attempt = 0; attempt < maxOverallRetries; attempt++) {
            String key = getValidKey();
            
            if (key == null) {
                // All keys are on cooldown. Wait for the one that finishes first.
                long now = System.currentTimeMillis();
                long minWait = keyCooldowns.values().stream().mapToLong(v -> v - now).min().orElse(30000L);
                log.info("Barcha kalitlar band. {}ms kutilmoqda...", minWait);
                try { Thread.sleep(Math.min(minWait, 10000L)); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                key = getValidKey(); // Try again after short wait
            }

            if (key == null) continue; // Still no key, loop again

            try {
                return callGeminiWithKey(prompt, key);
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                if (e.getStatusCode().value() == 429) {
                    markKeyAsLimited(key, 60); // Default 60s cooldown for 429
                    continue; // Seamlessly try next key in the next iteration
                }
                throw new RuntimeException("AI tahlilida xatolik: " + e.getResponseBodyAsString());
            } catch (Exception e) {
                log.error("AI Error with key {}: {}", key.substring(Math.max(0, key.length()-4)), e.getMessage());
                if (attempt == maxOverallRetries - 1) throw new RuntimeException("AI tahlili muvaffaqiyatsiz bo'ldi: " + e.getMessage());
            }
        }
        throw new com.lmscrm.backend.exception.AiServiceLimitException("Barcha AI serverlari band. Iltimos 1 daqiqadan so'ng urinib ko'ring.", 60);
    }

    private String callGeminiWithKey(String prompt, String key) throws Exception {
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(GEMINI_API_URL + key, entity, String.class);
        
        JsonNode rootNode = objectMapper.readTree(response.getBody());
        String resultText = rootNode.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        
        return extractJson(resultText);
    }

    public String analyzeIeltsWriting(String essay, String taskType) {
        String prompt = "You are an IELTS Examiner. Grade this " + taskType + ". Output JSON: {\"bandScore\": 7.0, \"criteria\": {...}, \"mistakes\": [...], \"detailedAnalysis\": \"...\"}\nEssay:\n" + cleanHtml(essay);
        return executeWithRotation(prompt, 3);
    }

    private String cleanHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
    }

    private String extractJson(String text) {
        if (text == null) return null;
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) return text.substring(start, end + 1);
        return text;
    }
}
