package com.lmscrm.backend.config;

import com.lmscrm.backend.service.aispeaking.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AISpeakingConfig {

    @Value("${ai.speaking.provider:mock}")
    private String providerType;

    @Bean
    public RestTemplate aiRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); // 5 seconds
        factory.setReadTimeout(15000);   // 15 seconds
        return new RestTemplate(factory);
    }

    @Bean
    public AIProvider aiProvider(
            MockAIProvider mockProvider,
            OpenAIProvider openAIProvider,
            GeminiProvider geminiProvider,
            ClaudeProvider claudeProvider
    ) {
        if ("openai".equalsIgnoreCase(providerType)) {
            return openAIProvider;
        } else if ("gemini".equalsIgnoreCase(providerType)) {
            return geminiProvider;
        } else if ("claude".equalsIgnoreCase(providerType)) {
            return claudeProvider;
        } else {
            return mockProvider;
        }
    }
}
