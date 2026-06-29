package com.lmscrm.backend.service.aispeaking;

import com.lmscrm.backend.domain.entity.SubscriptionPack;
import com.lmscrm.backend.domain.entity.UserAiUsage;
import com.lmscrm.backend.domain.entity.UserSubscription;
import com.lmscrm.backend.exception.AISubscriptionException;
import com.lmscrm.backend.repository.UserAiUsageRepository;
import com.lmscrm.backend.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsageEngineImpl implements UsageEngine {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final UserAiUsageRepository userAiUsageRepository;

    @Override
    @Transactional(readOnly = true)
    public void checkLimit(UUID userId, String featureCode, int amountToConsume) {
        log.info("[UsageEngine] Checking limit for user: {}, feature: {}, amount: {}", userId, featureCode, amountToConsume);

        // Find active subscription pack
        List<UserSubscription> subscriptions = userSubscriptionRepository.findByUserId(userId);
        LocalDateTime now = LocalDateTime.now();
        UserSubscription activeSub = subscriptions.stream()
                .filter(sub -> Boolean.TRUE.equals(sub.getIsActive()))
                .filter(sub -> sub.getExpiresAt() == null || sub.getExpiresAt().isAfter(now))
                .findFirst()
                .orElseThrow(() -> new AISubscriptionException(
                        "No active subscription plan found. Please purchase a plan to unlock AI features.",
                        "NO_ACTIVE_SUBSCRIPTION", true));

        SubscriptionPack pack = activeSub.getPack();
        if (pack == null) {
            throw new AISubscriptionException("Active plan package configuration is missing.", "NO_ACTIVE_PACK", true);
        }

        // 1. Permission checks
        verifyPermission(pack, featureCode);

        // 2. Load and reset usage counters if necessary
        UserAiUsage usage = findOrCreateUsage(userId);
        verifyResetCycle(usage);

        // 3. Limit checks
        if ("SpeakingMinutes".equalsIgnoreCase(featureCode) && !Boolean.TRUE.equals(pack.getAiUnlimitedSpeaking())) {
            int limit = pack.getAiLimitSpeakingMinutes() != null ? pack.getAiLimitSpeakingMinutes() : 0;
            if (usage.getSpeakingMinutesUsed() + amountToConsume > limit) {
                throw new AISubscriptionException("You have used all monthly AI Speaking minutes.", "AI_SPEAKING_LIMIT_REACHED", true);
            }
        } else if ("Messages".equalsIgnoreCase(featureCode) && !Boolean.TRUE.equals(pack.getAiUnlimitedMessages())) {
            int limit = pack.getAiLimitMessagesPerMonth() != null ? pack.getAiLimitMessagesPerMonth() : 0;
            if (usage.getMessagesUsed() + amountToConsume > limit) {
                throw new AISubscriptionException("You have used all monthly AI messages.", "AI_MESSAGES_LIMIT_REACHED", true);
            }
        } else if ("Tokens".equalsIgnoreCase(featureCode) && !Boolean.TRUE.equals(pack.getAiUnlimitedTokens())) {
            int limit = pack.getAiLimitTokens() != null ? pack.getAiLimitTokens() : 0;
            if (usage.getTokensUsed() + amountToConsume > limit) {
                throw new AISubscriptionException("Monthly AI Token limit exceeded.", "AI_TOKENS_LIMIT_REACHED", true);
            }
        } else if ("Sessions".equalsIgnoreCase(featureCode)) {
            int limit = pack.getAiLimitSessionsPerMonth() != null ? pack.getAiLimitSessionsPerMonth() : 0;
            if (usage.getSessionsUsed() + amountToConsume > limit) {
                throw new AISubscriptionException("Monthly AI Sessions limit reached.", "AI_SESSIONS_LIMIT_REACHED", true);
            }
        } else if ("Quiz".equalsIgnoreCase(featureCode)) {
            int limit = pack.getAiLimitQuizGenCount() != null ? pack.getAiLimitQuizGenCount() : 0;
            if (usage.getQuizGenerations() + amountToConsume > limit) {
                throw new AISubscriptionException("Monthly Quiz generation limit reached.", "AI_QUIZ_LIMIT_REACHED", true);
            }
        } else if ("Exam".equalsIgnoreCase(featureCode)) {
            int limit = pack.getAiLimitExamGenCount() != null ? pack.getAiLimitExamGenCount() : 0;
            if (usage.getExamGenerations() + amountToConsume > limit) {
                throw new AISubscriptionException("Monthly Exam generation limit reached.", "AI_EXAM_LIMIT_REACHED", true);
            }
        } else if ("Homework".equalsIgnoreCase(featureCode)) {
            int limit = pack.getAiLimitHomeworkAnalysisCount() != null ? pack.getAiLimitHomeworkAnalysisCount() : 0;
            if (usage.getHomeworkAnalysis() + amountToConsume > limit) {
                throw new AISubscriptionException("Monthly Homework analysis limit reached.", "AI_HOMEWORK_LIMIT_REACHED", true);
            }
        } else if ("Course".equalsIgnoreCase(featureCode)) {
            int limit = pack.getAiLimitCourseGenCount() != null ? pack.getAiLimitCourseGenCount() : 0;
            if (usage.getCourseGeneration() + amountToConsume > limit) {
                throw new AISubscriptionException("Monthly Course generation limit reached.", "AI_COURSE_LIMIT_REACHED", true);
            }
        } else if ("Feedback".equalsIgnoreCase(featureCode)) {
            int limit = pack.getAiLimitFeedbackCount() != null ? pack.getAiLimitFeedbackCount() : 0;
            if (usage.getFeedbackUsed() + amountToConsume > limit) {
                throw new AISubscriptionException("Monthly Feedback limit reached.", "AI_FEEDBACK_LIMIT_REACHED", true);
            }
        }
    }

    @Override
    @Transactional
    public void recordUsage(UUID userId, String featureCode, int amountConsumed) {
        log.info("[UsageEngine] Recording usage for user: {}, feature: {}, amount: {}", userId, featureCode, amountConsumed);
        UserAiUsage usage = findOrCreateUsage(userId);
        verifyResetCycle(usage);

        if ("SpeakingMinutes".equalsIgnoreCase(featureCode)) {
            usage.setSpeakingMinutesUsed(usage.getSpeakingMinutesUsed() + amountConsumed);
        } else if ("Messages".equalsIgnoreCase(featureCode)) {
            usage.setMessagesUsed(usage.getMessagesUsed() + amountConsumed);
        } else if ("Tokens".equalsIgnoreCase(featureCode)) {
            usage.setTokensUsed(usage.getTokensUsed() + amountConsumed);
        } else if ("Sessions".equalsIgnoreCase(featureCode)) {
            usage.setSessionsUsed(usage.getSessionsUsed() + amountConsumed);
        } else if ("Quiz".equalsIgnoreCase(featureCode)) {
            usage.setQuizGenerations(usage.getQuizGenerations() + amountConsumed);
        } else if ("Exam".equalsIgnoreCase(featureCode)) {
            usage.setExamGenerations(usage.getExamGenerations() + amountConsumed);
        } else if ("Homework".equalsIgnoreCase(featureCode)) {
            usage.setHomeworkAnalysis(usage.getHomeworkAnalysis() + amountConsumed);
        } else if ("Course".equalsIgnoreCase(featureCode)) {
            usage.setCourseGeneration(usage.getCourseGeneration() + amountConsumed);
        } else if ("Feedback".equalsIgnoreCase(featureCode)) {
            usage.setFeedbackUsed(usage.getFeedbackUsed() + amountConsumed);
        } else if ("Requests".equalsIgnoreCase(featureCode)) {
            usage.setRequestsToday(usage.getRequestsToday() + amountConsumed);
        }

        userAiUsageRepository.save(usage);
    }

    private void verifyPermission(SubscriptionPack pack, String featureCode) {
        boolean hasAccess = false;
        if ("Speaking".equalsIgnoreCase(featureCode) || "SpeakingMinutes".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessSpeaking());
        } else if ("Chat".equalsIgnoreCase(featureCode) || "Messages".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessChat());
        } else if ("Tutor".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessTutor());
        } else if ("Writing".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessWriting());
        } else if ("Quiz".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessQuizGenerator());
        } else if ("Exam".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessExamGenerator());
        } else if ("Homework".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessHomeworkAssistant());
        } else if ("Coding".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessCodingMentor());
        } else if ("Analytics".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessAnalytics());
        } else if ("Feedback".equalsIgnoreCase(featureCode)) {
            hasAccess = Boolean.TRUE.equals(pack.getAiAccessFeedback());
        } else {
            // General fallback
            hasAccess = true;
        }

        if (!hasAccess) {
            throw new AISubscriptionException(
                    "This feature is not included in your current subscription plan. Please upgrade.",
                    "AI_FEATURE_ACCESS_DENIED", true);
        }
    }

    private UserAiUsage findOrCreateUsage(UUID userId) {
        return userAiUsageRepository.findById(userId)
                .orElseGet(() -> {
                    UserAiUsage nu = UserAiUsage.builder()
                            .userId(userId)
                            .lastResetDate(LocalDateTime.now())
                            .build();
                    return userAiUsageRepository.save(nu);
                });
    }

    private void verifyResetCycle(UserAiUsage usage) {
        LocalDateTime now = LocalDateTime.now();
        if (usage.getLastResetDate() == null || usage.getLastResetDate().isBefore(now.minusDays(30))) {
            usage.setSpeakingMinutesUsed(0);
            usage.setMessagesUsed(0);
            usage.setRequestsToday(0);
            usage.setSessionsUsed(0);
            usage.setTokensUsed(0);
            usage.setVoiceMinutesUsed(0);
            usage.setFeedbackUsed(0);
            usage.setQuizGenerations(0);
            usage.setExamGenerations(0);
            usage.setHomeworkAnalysis(0);
            usage.setCourseGeneration(0);
            usage.setLastResetDate(now);
        }
    }
}
