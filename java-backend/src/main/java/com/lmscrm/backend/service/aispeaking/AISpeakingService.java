package com.lmscrm.backend.service.aispeaking;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.dto.aispeaking.*;
import com.lmscrm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AISpeakingService {

    private final SpeakingSessionRepository sessionRepository;
    private final ConversationMessageRepository messageRepository;
    private final SpeakingScoreRepository scoreRepository;
    private final SpeakingStatisticsRepository statisticsRepository;
    private final GeminiProvider geminiProvider;
    private final MockAIProvider mockAIProvider;
    private final AIProvider aiProvider;
    private final UsageEngine usageEngine;

    @Transactional
    public SessionStartResponseDto startSession(UUID userId, SessionStartRequestDto dto) {
        // Enforce active subscription and check limit check
        usageEngine.checkLimit(userId, "Speaking", 1);
        usageEngine.checkLimit(userId, "Sessions", 1);

        // Record session count consumption
        usageEngine.recordUsage(userId, "Sessions", 1);

        SpeakingSession session = SpeakingSession.builder()
                .userId(userId)
                .topic(dto.getTopic() != null ? dto.getTopic() : "Daily Conversation")
                .level(dto.getLevel() != null ? dto.getLevel() : "Intermediate (B2)")
                .language(dto.getLanguage() != null ? dto.getLanguage() : "English")
                .startTime(LocalDateTime.now())
                .messageCount(0)
                .wordCount(0)
                .active(true)
                .build();

        SpeakingSession saved = sessionRepository.save(session);

        ConversationMessage welcomeMsg = ConversationMessage.builder()
                .sessionId(saved.getId())
                .sender("ai")
                .content("Hello! I'm your AI speaking assistant. Today, we're practicing: \"" + saved.getTopic() + "\". Please hold the microphone button to start speaking!")
                .timestamp(LocalDateTime.now())
                .build();
        messageRepository.save(welcomeMsg);

        return SessionStartResponseDto.builder()
                .id(saved.getId())
                .topic(saved.getTopic())
                .level(saved.getLevel())
                .language(saved.getLanguage())
                .startTime(saved.getStartTime())
                .build();
    }

    @Transactional
    public ChatResponseDto processChat(UUID userId, ChatRequestDto dto) {
        if (dto.getMessage() == null || dto.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }
        if (dto.getMessage().length() > 500) {
            throw new IllegalArgumentException("Prompt length exceeds maximum limit of 500 characters");
        }

        // Validate user messages limit
        usageEngine.checkLimit(userId, "Messages", 1);

        // Record messages consumption
        usageEngine.recordUsage(userId, "Messages", 1);

        SpeakingSession session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        if (!session.isActive()) {
            throw new IllegalStateException("Session is completed");
        }

        LocalDateTime now = LocalDateTime.now();

        ConversationMessage userMsg = ConversationMessage.builder()
                .sessionId(session.getId())
                .sender("user")
                .content(dto.getMessage())
                .timestamp(now)
                .build();
        messageRepository.save(userMsg);

        int words = dto.getMessage().split("\\s+").length;
        session.setWordCount(session.getWordCount() + words);
        session.setMessageCount(session.getMessageCount() + 1);

        List<ConversationMessage> history = messageRepository.findAllBySessionIdOrderByTimestampAsc(session.getId());
        List<ConversationMessage> limitedHistory = history;
        if (history.size() > 8) {
            limitedHistory = history.subList(history.size() - 8, history.size());
        }

        String aiResponse = null;
        try {
            aiResponse = aiProvider.generateResponse(dto.getMessage(), limitedHistory);
        } catch (Exception e) {
            log.error("Primary AI provider failed, falling back to Gemini.", e);
            try {
                aiResponse = geminiProvider.generateResponse(dto.getMessage(), limitedHistory);
            } catch (Exception ex) {
                log.error("Gemini provider failed, falling back to Mock.", ex);
                aiResponse = mockAIProvider.generateResponse(dto.getMessage(), limitedHistory);
            }
        }

        ConversationMessage aiMsg = ConversationMessage.builder()
                .sessionId(session.getId())
                .sender("ai")
                .content(aiResponse)
                .timestamp(LocalDateTime.now())
                .build();
        messageRepository.save(aiMsg);
        session.setMessageCount(session.getMessageCount() + 1);
        sessionRepository.save(session);

        return ChatResponseDto.builder()
                .response(aiResponse)
                .sessionId(session.getId())
                .status("success")
                .build();
    }

    @Transactional
    public SessionEndResponseDto endSession(UUID userId, SessionEndRequestDto dto) {
        SpeakingSession session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        if (session.isActive()) {
            session.setActive(false);
            session.setEndTime(LocalDateTime.now());
            sessionRepository.save(session);

            Random random = new Random();
            int scoreBase = Math.min(95, 60 + Math.min(25, session.getMessageCount() * 3));
            int pronunciation = scoreBase + random.nextInt(8) - 4;
            int fluency = scoreBase + random.nextInt(8) - 4;
            int grammar = scoreBase + random.nextInt(8) - 4;
            int vocabulary = scoreBase + random.nextInt(8) - 4;
            int confidence = scoreBase + random.nextInt(8) - 4;
            int overall = (pronunciation + fluency + grammar + vocabulary + confidence) / 5;

            SpeakingScore score = SpeakingScore.builder()
                    .sessionId(session.getId())
                    .pronunciation(Math.max(50, Math.min(99, pronunciation)))
                    .fluency(Math.max(50, Math.min(99, fluency)))
                    .grammar(Math.max(50, Math.min(99, grammar)))
                    .vocabulary(Math.max(50, Math.min(99, vocabulary)))
                    .confidence(Math.max(50, Math.min(99, confidence)))
                    .overall(Math.max(50, Math.min(99, overall)))
                    .createdAt(LocalDateTime.now())
                    .build();
            scoreRepository.save(score);

            SpeakingStatistics stats = statisticsRepository.findByUserId(userId)
                    .orElseGet(() -> SpeakingStatistics.builder().userId(userId).build());

            long sessionMinutes = Duration.between(session.getStartTime(), session.getEndTime()).toMinutes();
            int actualMinutes = Math.max(1, (int) sessionMinutes);
            stats.setDailySpeakingTime(stats.getDailySpeakingTime() + actualMinutes);
            stats.setWordsLearned(stats.getWordsLearned() + session.getWordCount() / 3); 
            stats.setSessionsCompleted(stats.getSessionsCompleted() + 1);
            stats.setAverageScore((stats.getAverageScore() * (stats.getSessionsCompleted() - 1) + score.getOverall()) / stats.getSessionsCompleted());
            stats.setStreak(stats.getStreak() == 0 ? 1 : stats.getStreak()); 
            statisticsRepository.save(stats);

            // Record speaking minutes usage in subscription engine
            usageEngine.recordUsage(userId, "SpeakingMinutes", actualMinutes);

            return SessionEndResponseDto.builder()
                    .sessionId(session.getId())
                    .status("completed")
                    .score(SessionEndResponseDto.ScoreDto.builder()
                            .pronunciation(score.getPronunciation())
                            .fluency(score.getFluency())
                            .grammar(score.getGrammar())
                            .vocabulary(score.getVocabulary())
                            .confidence(score.getConfidence())
                            .overall(score.getOverall())
                            .build())
                    .build();
        }

        throw new IllegalStateException("Session was already completed");
    }

    public List<HistoryResponseDto> getUserHistory(UUID userId) {
        List<SpeakingSession> sessions = sessionRepository.findAllByUserIdOrderByStartTimeDesc(userId);
        return sessions.stream().map(s -> {
            Optional<SpeakingScore> scoreOpt = scoreRepository.findBySessionId(s.getId());
            int score = scoreOpt.map(SpeakingScore::getOverall).orElse(0);
            int durationSeconds = 0;
            if (s.getEndTime() != null) {
                durationSeconds = (int) Duration.between(s.getStartTime(), s.getEndTime()).toSeconds();
            }
            return HistoryResponseDto.builder()
                    .id(s.getId())
                    .topic(s.getTopic())
                    .date(s.getStartTime())
                    .duration(durationSeconds)
                    .score(score)
                    .language(s.getLanguage())
                    .build();
        }).collect(Collectors.toList());
    }

    public StatisticsResponseDto getUserStatistics(UUID userId) {
        SpeakingStatistics stats = statisticsRepository.findByUserId(userId)
                .orElseGet(() -> SpeakingStatistics.builder()
                        .userId(userId)
                        .dailySpeakingTime(15)
                        .streak(5)
                        .wordsLearned(210)
                        .sessionsCompleted(12)
                        .averageScore(80)
                        .build()); 

        return StatisticsResponseDto.builder()
                .pronunciation(stats.getAverageScore() + 2)
                .fluency(stats.getAverageScore() - 1)
                .grammar(stats.getAverageScore())
                .vocabulary(stats.getAverageScore() - 3)
                .confidence(stats.getAverageScore() + 4)
                .dailySpeakingTime(stats.getDailySpeakingTime())
                .streak(stats.getStreak())
                .wordsLearned(stats.getWordsLearned())
                .sessionsCompleted(stats.getSessionsCompleted())
                .build();
    }
}
