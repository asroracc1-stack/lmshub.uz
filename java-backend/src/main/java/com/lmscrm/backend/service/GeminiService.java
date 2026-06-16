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
    private final Set<String> bannedKeys = new java.util.concurrent.CopyOnWriteArraySet<>();
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
                int statusCode = e.getStatusCode().value();
                if (statusCode == 429 || statusCode == 503) {
                    markKeyAsLimited(key, statusCode == 503 ? 10 : 60);
                    try { Thread.sleep(2000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    continue;
                } else if (statusCode == 403) {
                    // Key is banned/leaked — permanently disable it for this session
                    bannedKeys.add(key);
                    keyCooldowns.put(key, Long.MAX_VALUE);
                    log.error("🔑 Gemini API key ...{} banned/leaked (403). Marking as permanently disabled.",
                        key.substring(Math.max(0, key.length() - 4)));
                    if (bannedKeys.size() >= apiKeysList.size()) {
                        throw new RuntimeException("AI xizmati mavjud emas: API kaliti muddati o'tgan yoki bloklangan. Yangi Gemini API kaliti kerak.");
                    }
                    continue;
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

    public String executeWithRotation(Map<String, Object> requestBody, int maxOverallRetries) {
        for (int attempt = 0; attempt < maxOverallRetries; attempt++) {
            String key = getValidKey();
            
            if (key == null) {
                long now = System.currentTimeMillis();
                long minWait = keyCooldowns.values().stream().mapToLong(v -> v - now).min().orElse(30000L);
                log.info("Barcha kalitlar band. {}ms kutilmoqda...", minWait);
                try { Thread.sleep(Math.min(minWait, 10000L)); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                key = getValidKey();
            }

            if (key == null) continue;

            try {
                return callGeminiWithKeyAndBody(requestBody, key);
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                int statusCode = e.getStatusCode().value();
                if (statusCode == 429 || statusCode == 503) {
                    markKeyAsLimited(key, statusCode == 503 ? 10 : 60);
                    try { Thread.sleep(2000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    continue;
                } else if (statusCode == 403) {
                    bannedKeys.add(key);
                    keyCooldowns.put(key, Long.MAX_VALUE);
                    log.error("🔑 Gemini API key ...{} banned/leaked (403). Marking as permanently disabled.",
                        key.substring(Math.max(0, key.length() - 4)));
                    if (bannedKeys.size() >= apiKeysList.size()) {
                        throw new RuntimeException("AI xizmati mavjud emas: API kaliti muddati o'tgan yoki bloklangan. Yangi Gemini API kaliti kerak.");
                    }
                    continue;
                }
                throw new RuntimeException("AI tahlilida xatolik: " + e.getResponseBodyAsString());
            } catch (Exception e) {
                log.error("AI Error with key {}: {}", key.substring(Math.max(0, key.length()-4)), e.getMessage());
                if (attempt == maxOverallRetries - 1) throw new RuntimeException("AI tahlili muvaffaqiyatsiz bo'ldi: " + e.getMessage());
            }
        }
        throw new com.lmscrm.backend.exception.AiServiceLimitException("Barcha AI serverlari band. Iltimos 1 daqiqadan so'ng urinib ko'ring.", 60);
    }

    private String callGeminiWithKeyAndBody(Map<String, Object> requestBody, String key) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(GEMINI_API_URL + key, entity, String.class);
        
        JsonNode rootNode = objectMapper.readTree(response.getBody());
        String resultText = rootNode.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        
        return extractJson(resultText);
    }

    public String analyzePdfMock(byte[] pdfBytes) {
        if (apiKeysList.isEmpty()) {
            throw new RuntimeException("Tizim sozlamalarida xatolik: Yaroqli Gemini API kaliti (GEMINI_API_KEY) topilmadi.");
        }

        String base64Pdf = Base64.getEncoder().encodeToString(pdfBytes);
        
        String prompt = "You are a professional teacher and exam creator. Analyze this exam PDF document.\n" +
                "Extract all the questions, their possible options (if multiple choice), find the correct answer for each, and write a detailed step-by-step explanation for the solution of each question.\n" +
                "CRITICAL INSTRUCTIONS:\n" +
                "1. For any mathematical expressions, formulas, integrals, fractions, exponents, equations, or special characters, you MUST write them in standard, clean LaTeX format using $...$ for inline math and $$...$$ for block display math (e.g. use \\frac{a}{b}, \\int_{a}^{b}, \\sqrt{x}, \\cdot, etc.) so they render exactly 1-to-1 on the web page.\n" +
                "2. SHAPES AND DIAGRAMS: If a question contains any geometric shapes, diagrams, graphs, or visual figures (like triangles, circles, coordinate planes, graphs, etc.), you MUST analyze the shape and RECREATE IT EXACTLY using raw inline SVG code. Insert this SVG code directly into the question 'prompt' or 'explanation'. Use appropriate SVG viewBox, paths, circles, texts, and styling to make it look identical to the PDF. DO NOT skip the images! Embed the SVG directly inside the JSON string.\n" +
                "Output ONLY a raw JSON object with the following root structure: {\"sections\": [...]}\n" +
                "There should be at least one section. Each section must look like this: {\"title\": \"...\", \"passage\": \"...\", \"questions\": [...]}\n" +
                "Each question must look like this: {\"prompt\": \"Savol matni (prompt) va <svg>...SVG shakl...</svg>\", \"qtype\": \"mcq\", \"options\": [\"Option A text\", \"Option B text\", \"Option C text\", \"Option D text\"], \"correct_answer\": \"The exact text of the correct option\", \"points\": 1, \"explanation\": \"Step-by-step explanation of the solution in LaTeX/Markdown\"}\n" +
                "If the PDF questions are not MCQs, use \"qtype\": \"short\" and leave options array empty.";

        Map<String, Object> partText = Map.of("text", prompt);
        Map<String, Object> partPdf = Map.of("inlineData", Map.of(
            "mimeType", "application/pdf",
            "data", base64Pdf
        ));
        
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of("parts", List.of(partText, partPdf)))
        );

        return executeWithRotation(requestBody, 3);
    }

    public String analyzeIeltsWriting(String essay, String taskType) {
        String prompt = "You are an IELTS Examiner. Grade this " + taskType + ". Output JSON: {\"bandScore\": 7.0, \"criteria\": {...}, \"mistakes\": [...], \"detailedAnalysis\": \"...\"}\nEssay:\n" + cleanHtml(essay);
        return executeWithRotation(prompt, 3);
    }

    public String generateExamReview(String examDataJson) {
        if (apiKeysList.isEmpty()) {
            throw new RuntimeException("AI tizimi sozlanmagan (kalit yo'q).");
        }
        String prompt = "You are an expert AI Tutor and Exam Examiner. Analyze the student's exam submission.\n" +
                "I will provide a JSON containing the exam questions, the correct answers, and the student's answers (along with time spent).\n" +
                "You need to evaluate their performance, provide coaching feedback, and write a step-by-step explanation for EACH question (especially if they got it wrong, explain why the correct answer is right and their answer is wrong; if they got it right, briefly reinforce the concept).\n" +
                "IMPORTANT: Format any math formulas in the explanation using standard LaTeX with $...$ or $$...$$.\n" +
                "Output ONLY a raw JSON object (no markdown formatting blocks) with the following exact structure:\n" +
                "{\n" +
                "  \"coachFeedback\": {\n" +
                "    \"strengths\": [\"Strength 1\", \"Strength 2\"],\n" +
                "    \"weaknesses\": [\"Weakness 1\", \"Weakness 2\"],\n" +
                "    \"recommendedTopics\": [\"Topic 1\", \"Topic 2\"],\n" +
                "    \"studyPlan\": \"A short paragraph of encouraging study plan\"\n" +
                "  },\n" +
                "  \"predictedScore\": \"e.g. 1200 / 1600 or 6.5 Band or 85/100\",\n" +
                "  \"explanations\": {\n" +
                "    \"QUESTION_ID_UUID_HERE\": \"Detailed step-by-step explanation...\",\n" +
                "    \"ANOTHER_UUID\": \"...\"\n" +
                "  }\n" +
                "}\n" +
                "\nExam Data:\n" + examDataJson;
        
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
