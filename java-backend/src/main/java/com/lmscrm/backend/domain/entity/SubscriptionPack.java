package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "subscription_packs", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPack {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "old_price")
    private BigDecimal oldPrice;

    @Column(name = "discount_percent")
    private Integer discountPercent;

    @Column(nullable = false)
    private Integer duration; // in months

    @Column(name = "duration_days")
    @Builder.Default
    private Integer durationDays = 30;

    @Column(name = "color_and_design")
    private String colorAndDesign;

    private String icon;

    @Column(name = "access_all_mocks")
    @Builder.Default
    private Boolean accessAllMocks = false;

    @Column(name = "access_sat_mocks")
    @Builder.Default
    private Boolean accessSatMocks = false;

    @Column(name = "access_nat_mocks")
    @Builder.Default
    private Boolean accessNatMocks = false;

    @Column(name = "access_ielts_mocks")
    @Builder.Default
    private Boolean accessIeltsMocks = false;

    @Column(name = "access_custom_mocks")
    @Builder.Default
    private Boolean accessCustomMocks = false;

    @Column(name = "access_all_books")
    @Builder.Default
    private Boolean accessAllBooks = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "subscription_pack_features", joinColumns = @JoinColumn(name = "pack_id"))
    @Column(name = "feature")
    @Builder.Default
    private List<String> features = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "subscription_pack_exams",
        joinColumns = @JoinColumn(name = "pack_id"),
        inverseJoinColumns = @JoinColumn(name = "exam_id")
    )
    @Builder.Default
    private List<Exam> exams = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "subscription_pack_books",
        joinColumns = @JoinColumn(name = "pack_id"),
        inverseJoinColumns = @JoinColumn(name = "material_id")
    )
    @Builder.Default
    private List<LibraryMaterial> allowedBooks = new ArrayList<>();

    @Column(name = "is_popular")
    @Builder.Default
    private Boolean isPopular = false;

    // AI Permissions
    @Column(name = "ai_access_speaking")
    @Builder.Default
    private Boolean aiAccessSpeaking = false;

    @Column(name = "ai_access_chat")
    @Builder.Default
    private Boolean aiAccessChat = false;

    @Column(name = "ai_access_tutor")
    @Builder.Default
    private Boolean aiAccessTutor = false;

    @Column(name = "ai_access_feedback")
    @Builder.Default
    private Boolean aiAccessFeedback = false;

    @Column(name = "ai_access_analytics")
    @Builder.Default
    private Boolean aiAccessAnalytics = false;

    @Column(name = "ai_access_writing")
    @Builder.Default
    private Boolean aiAccessWriting = false;

    @Column(name = "ai_access_exam_generator")
    @Builder.Default
    private Boolean aiAccessExamGenerator = false;

    @Column(name = "ai_access_quiz_generator")
    @Builder.Default
    private Boolean aiAccessQuizGenerator = false;

    @Column(name = "ai_access_coding_mentor")
    @Builder.Default
    private Boolean aiAccessCodingMentor = false;

    @Column(name = "ai_access_homework_assistant")
    @Builder.Default
    private Boolean aiAccessHomeworkAssistant = false;

    // AI Limits
    @Column(name = "ai_limit_speaking_minutes")
    @Builder.Default
    private Integer aiLimitSpeakingMinutes = 0;

    @Column(name = "ai_limit_messages_per_month")
    @Builder.Default
    private Integer aiLimitMessagesPerMonth = 0;

    @Column(name = "ai_limit_requests_per_day")
    @Builder.Default
    private Integer aiLimitRequestsPerDay = 0;

    @Column(name = "ai_limit_sessions_per_month")
    @Builder.Default
    private Integer aiLimitSessionsPerMonth = 0;

    @Column(name = "ai_limit_tokens")
    @Builder.Default
    private Integer aiLimitTokens = 0;

    @Column(name = "ai_limit_voice_minutes")
    @Builder.Default
    private Integer aiLimitVoiceMinutes = 0;

    @Column(name = "ai_limit_feedback_count")
    @Builder.Default
    private Integer aiLimitFeedbackCount = 0;

    @Column(name = "ai_limit_quiz_gen_count")
    @Builder.Default
    private Integer aiLimitQuizGenCount = 0;

    @Column(name = "ai_limit_course_gen_count")
    @Builder.Default
    private Integer aiLimitCourseGenCount = 0;

    @Column(name = "ai_limit_exam_gen_count")
    @Builder.Default
    private Integer aiLimitExamGenCount = 0;

    @Column(name = "ai_limit_homework_analysis_count")
    @Builder.Default
    private Integer aiLimitHomeworkAnalysisCount = 0;

    // AI Unlimited Option
    @Column(name = "ai_unlimited_speaking")
    @Builder.Default
    private Boolean aiUnlimitedSpeaking = false;

    @Column(name = "ai_unlimited_messages")
    @Builder.Default
    private Boolean aiUnlimitedMessages = false;

    @Column(name = "ai_unlimited_tokens")
    @Builder.Default
    private Boolean aiUnlimitedTokens = false;

    // AI Premium Feature Matrix
    @Column(name = "ai_feature_premium_voices")
    @Builder.Default
    private Boolean aiFeaturePremiumVoices = false;

    @Column(name = "ai_feature_ielts_coach")
    @Builder.Default
    private Boolean aiFeatureIeltsCoach = false;

    @Column(name = "ai_feature_business_english")
    @Builder.Default
    private Boolean aiFeatureBusinessEnglish = false;

    @Column(name = "ai_feature_interview_coach")
    @Builder.Default
    private Boolean aiFeatureInterviewCoach = false;

    @Column(name = "ai_feature_conversation_history")
    @Builder.Default
    private Boolean aiFeatureConversationHistory = false;

    @Column(name = "ai_feature_advanced_feedback")
    @Builder.Default
    private Boolean aiFeatureAdvancedFeedback = false;

    @Column(name = "ai_feature_fast_responses")
    @Builder.Default
    private Boolean aiFeatureFastResponses = false;

    @Column(name = "ai_feature_priority_queue")
    @Builder.Default
    private Boolean aiFeaturePriorityQueue = false;

    @Column(name = "ai_feature_teacher_dashboard")
    @Builder.Default
    private Boolean aiFeatureTeacherDashboard = false;

    @Column(name = "ai_feature_organization_ai")
    @Builder.Default
    private Boolean aiFeatureOrganizationAi = false;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PackType type; // FREE, PRO, ELITE

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    @Column(nullable = false)
    @Builder.Default
    private Integer totalPurchases = 0;

    public enum PackType {
        FREE, PRO, ELITE
    }
}
