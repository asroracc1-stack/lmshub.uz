package com.lmscrm.backend.service.aispeaking;

import java.util.UUID;

public interface UsageEngine {
    void checkLimit(UUID userId, String featureCode, int amountToConsume);
    void recordUsage(UUID userId, String featureCode, int amountConsumed);
}
