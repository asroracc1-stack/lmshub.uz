package com.lmscrm.backend.service.aispeaking;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lmscrm.backend.domain.entity.ConversationMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;

@Service
@Slf4j
public class GeminiProvider implements AIProvider {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiProvider(RestTemplate aiRestTemplate) {
        this.restTemplate = aiRestTemplate;
    }

    @Override
    public String generateResponse(String prompt, List<ConversationMessage> history) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API Key is missing. Falling back to Mock response.");
            return "Gemini Provider is not configured with an API key.";
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode contentsArray = objectMapper.createArrayNode();

            for (ConversationMessage msg : history) {
                ObjectNode contentObj = objectMapper.createObjectNode();
                contentObj.put("role", "user".equalsIgnoreCase(msg.getSender()) ? "user" : "model");
                ArrayNode partsArray = objectMapper.createArrayNode();
                ObjectNode textPart = objectMapper.createObjectNode();
                textPart.put("text", msg.getContent());
                partsArray.add(textPart);
                contentObj.set("parts", partsArray);
                contentsArray.add(contentObj);
            }

            ObjectNode activeContent = objectMapper.createObjectNode();
            activeContent.put("role", "user");
            ArrayNode activeParts = objectMapper.createArrayNode();
            ObjectNode activeText = objectMapper.createObjectNode();
            activeText.put("text", prompt + " (Please act as an English speaking partner. Give a short response of 2-3 sentences max and ask a follow-up question.)");
            activeParts.add(activeText);
            activeContent.set("parts", activeParts);
            contentsArray.add(activeContent);

            requestBody.set("contents", contentsArray);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                var jsonNode = objectMapper.readTree(response.getBody());
                return jsonNode.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText().trim();
            }
        } catch (Exception e) {
            log.error("Failed to fetch response from Gemini", e);
        }
        return "Sorry, I had trouble connecting to the Gemini service.";
    }
}
