package com.lmscrm.backend.service.aispeaking;

import com.lmscrm.backend.domain.entity.ConversationMessage;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Random;

@Service
public class MockAIProvider implements AIProvider {

    private final String[] mockResponses = {
        "That is an excellent point. How do you think this affects daily lives?",
        "I understand. Learning a new language indeed takes practice and dedication.",
        "Fascinating. Could you elaborate more on the reasons behind your opinion?",
        "Indeed. The separation between professional and personal life is essential.",
        "Very true! Traveling opens up mind-boggling insights into other cultures."
    };

    @Override
    public String generateResponse(String prompt, List<ConversationMessage> history) {
        Random random = new Random();
        return mockResponses[random.nextInt(mockResponses.length)];
    }
}
