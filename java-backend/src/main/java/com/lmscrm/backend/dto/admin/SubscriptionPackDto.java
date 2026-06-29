package com.lmscrm.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPackDto {
    private UUID id;
    private String code;
    private String name;
    private BigDecimal price;
    private BigDecimal oldPrice;
    private Integer discountPercent;
    private Integer duration;
    private Integer durationDays;
    private String colorAndDesign;
    private String icon;
    private Boolean accessAllMocks;
    private Boolean accessSatMocks;
    private Boolean accessNatMocks;
    private Boolean accessIeltsMocks;
    private Boolean accessCustomMocks;
    private Boolean accessAllBooks;
    private List<String> features;
    private Boolean isPopular;
    private String type; // FREE, PRO, ELITE
    private String status; // ACTIVE, INACTIVE
    private Integer totalPurchases;
    private List<UUID> examIds;
    private List<UUID> allowedBookIds;

    // AI Permissions
    private Boolean aiAccessSpeaking;
    private Boolean aiAccessChat;
    private Boolean aiAccessTutor;
    private Boolean aiAccessFeedback;
    private Boolean aiAccessAnalytics;
    private Boolean aiAccessWriting;
    private Boolean aiAccessExamGenerator;
    private Boolean aiAccessQuizGenerator;
    private Boolean aiAccessCodingMentor;
    private Boolean aiAccessHomeworkAssistant;

    // AI Limits
    private Integer aiLimitSpeakingMinutes;
    private Integer aiLimitMessagesPerMonth;
    private Integer aiLimitRequestsPerDay;
    private Integer aiLimitSessionsPerMonth;
    private Integer aiLimitTokens;
    private Integer aiLimitVoiceMinutes;
    private Integer aiLimitFeedbackCount;
    private Integer aiLimitQuizGenCount;
    private Integer aiLimitCourseGenCount;
    private Integer aiLimitExamGenCount;
    private Integer aiLimitHomeworkAnalysisCount;

    // AI Unlimited Options
    private Boolean aiUnlimitedSpeaking;
    private Boolean aiUnlimitedMessages;
    private Boolean aiUnlimitedTokens;

    // AI Premium Feature Matrix
    private Boolean aiFeaturePremiumVoices;
    private Boolean aiFeatureIeltsCoach;
    private Boolean aiFeatureBusinessEnglish;
    private Boolean aiFeatureInterviewCoach;
    private Boolean aiFeatureConversationHistory;
    private Boolean aiFeatureAdvancedFeedback;
    private Boolean aiFeatureFastResponses;
    private Boolean aiFeaturePriorityQueue;
    private Boolean aiFeatureTeacherDashboard;
    private Boolean aiFeatureOrganizationAi;
}
