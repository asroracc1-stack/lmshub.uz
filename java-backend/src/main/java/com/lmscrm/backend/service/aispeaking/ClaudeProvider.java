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
public class ClaudeProvider implements AIProvider {

    @Value("${claude.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ClaudeProvider(RestTemplate aiRestTemplate) {
        this.restTemplate = aiRestTemplate;
    }

    @Override
    public String generateResponse(String prompt, List<ConversationMessage> history) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Claude API Key is missing. Falling back to Mock response.");
            return "Claude Provider is not configured with an API key.";
        }

        try {
            String url = "https://api.anthropic.com/v1/messages";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", "claude-3-5-sonnet-20240620");
            requestBody.put("max_tokens", 300);
            requestBody.put("system", "You are an empathetic, professional English speaking partner for an LMS platform. " +
                    "Keep your responses short, conversational, and encouraging, maximum 2-3 sentences. Ask questions to keep the dialogue flowing naturally.");

            ArrayNode messagesArray = objectMapper.createArrayNode();

            for (ConversationMessage msg : history) {
                ObjectNode historyMsg = objectMapper.createObjectNode();
                historyMsg.put("role", "user".equalsIgnoreCase(msg.getSender()) ? "user" : "assistant");
                historyMsg.put("content", msg.getContent());
                messagesArray.add(historyMsg);
            }

            ObjectNode activeMsg = objectMapper.createObjectNode();
            activeMsg.put("role", "user");
            activeMsg.put("content", prompt);
            messagesArray.add(activeMsg);

            requestBody.set("messages", messagesArray);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                var jsonNode = objectMapper.readTree(response.getBody());
                return jsonNode.path("content").path(0).path("text").asText().trim();
            }
        } catch (Exception e) {
            log.error("Failed to fetch response from Claude", e);
        }
        return "Sorry, I had trouble connecting to the Claude service.";
    }
}
