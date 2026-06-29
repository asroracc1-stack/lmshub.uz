package com.lmscrm.backend.service.aispeaking;

import com.lmscrm.backend.domain.entity.ConversationMessage;
import java.util.List;

public interface AIProvider {
    String generateResponse(String prompt, List<ConversationMessage> history);
}
