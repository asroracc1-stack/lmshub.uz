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
public class OpenAIProvider implements AIProvider {

    @Value("${openai.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenAIProvider(RestTemplate aiRestTemplate) {
        this.restTemplate = aiRestTemplate;
    }

    @Override
    public String generateResponse(String prompt, List<ConversationMessage> history) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("OpenAI API Key is missing. Falling back to Mock response.");
            return "OpenAI Provider is not configured with an API key.";
        }

        try {
            String url = "https://api.openai.com/v1/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", "gpt-4o-mini"); 

            ArrayNode messagesArray = objectMapper.createArrayNode();
            
            ObjectNode systemMsg = objectMapper.createObjectNode();
            systemMsg.put("role", "system");
            systemMsg.put("content", "You are an empathetic, professional English speaking partner for an LMS platform. " +
                    "Keep your responses short, conversational, and encouraging, maximum 2-3 sentences. Ask questions to keep the dialogue flowing naturally.");
            messagesArray.add(systemMsg);

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
                return jsonNode.path("choices").path(0).path("message").path("content").asText().trim();
            }
        } catch (Exception e) {
            log.error("Failed to fetch response from OpenAI", e);
        }
        return "Sorry, I had trouble connecting to the OpenAI service.";
    }
}
