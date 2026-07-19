package com.lmscrm.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.NotificationType;
import com.lmscrm.backend.domain.enums.WordStatus;
import com.lmscrm.backend.repository.*;
import com.lmscrm.backend.service.communication.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VocabularyService {

    private final VocabularyWordRepository wordRepository;
    private final UserVocabularyProgressRepository progressRepository;
    private final UserVocabularyUnitProgressRepository unitProgressRepository;
    private final UserVocabularySettingsRepository settingsRepository;
    private final UserVocabularyAchievementRepository achievementRepository;
    private final UserRepository userRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final XpTransactionRepository xpTransactionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final PracticeSessionRepository practiceSessionRepository;
    private final GeminiService geminiService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── ADMIN WORD CRUD ──────────────────────────────────────────────────────

    @Transactional
    public VocabularyWord createWord(VocabularyWord word) {
        if (wordRepository.findByWordIgnoreCase(word.getWord()).isPresent()) {
            throw new RuntimeException("Word '" + word.getWord() + "' already exists!");
        }
        return wordRepository.save(word);
    }

    @Transactional
    public VocabularyWord updateWord(UUID id, VocabularyWord data) {
        VocabularyWord existing = wordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Word not found"));
        existing.setWord(data.getWord());
        existing.setTranslation(data.getTranslation());
        existing.setIpaUs(data.getIpaUs());
        existing.setIpaUk(data.getIpaUk());
        existing.setPartOfSpeech(data.getPartOfSpeech());
        existing.setDefinition(data.getDefinition());
        existing.setExampleSentence(data.getExampleSentence());
        existing.setUzbekExample(data.getUzbekExample());
        existing.setImageUrl(data.getImageUrl());
        existing.setAudioUsUrl(data.getAudioUsUrl());
        existing.setAudioUkUrl(data.getAudioUkUrl());
        existing.setLevel(data.getLevel());
        existing.setUnit(data.getUnit());
        existing.setSynonyms(data.getSynonyms());
        existing.setAntonyms(data.getAntonyms());
        existing.setDifficultyScore(data.getDifficultyScore());
        existing.setCollocations(data.getCollocations());
        existing.setCommonMistakes(data.getCommonMistakes());
        existing.setPronunciationTips(data.getPronunciationTips());
        existing.setCategory(data.getCategory());
        return wordRepository.save(existing);
    }

    @Transactional
    public void deleteWord(UUID id) {
        wordRepository.deleteById(id);
    }

    public VocabularyWord getWordById(UUID id) {
        return wordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Word not found"));
    }

    @Transactional(readOnly = true)
    public Page<VocabularyWord> searchWords(String search, String level, String category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("word").ascending());
        String searchParam = (search != null && !search.trim().isEmpty()) 
                ? "%" + search.trim().toLowerCase() + "%" 
                : "%%";
        return wordRepository.searchWords(
                searchParam,
                (level != null && !level.trim().isEmpty()) ? level.trim().toUpperCase() : null,
                (category != null && !category.trim().isEmpty()) ? category.trim() : null,
                pageable
        );
    }

    public List<VocabularyWord> getWordsByLevelAndUnit(String level, Integer unit) {
        String cleanLevel = (level != null) ? level.trim().toUpperCase() : "A1";
        return wordRepository.findByLevelAndUnitOrderByWordAsc(cleanLevel, unit);
    }

    public List<String> getCategories() {
        return wordRepository.findAllCategories();
    }

    // ─── USER SETTINGS & GOALS ───────────────────────────────────────────────

    @Transactional
    public UserVocabularySettings getOrCreateSettings(UUID userId) {
        return settingsRepository.findById(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    UserVocabularySettings settings = UserVocabularySettings.builder()
                            .user(user)
                            .dailyGoal(20)
                            .currentStreak(0)
                            .longestStreak(0)
                            .vocabularyTitle("Novice")
                            .claimedChests("")
                            .build();
                    return settingsRepository.save(settings);
                });
    }

    @Transactional
    public UserVocabularySettings updateDailyGoal(UUID userId, Integer goal) {
        UserVocabularySettings settings = getOrCreateSettings(userId);
        settings.setDailyGoal(goal);
        return settingsRepository.save(settings);
    }

    // ─── ROADMAP & COUNTDOWNS ────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> getRoadmap(UUID userId, String level, boolean isPremium) {
        String cleanLevel = (level != null) ? level.trim().toUpperCase() : "A1";
        List<VocabularyWord> allWords = wordRepository.findByLevelOrderByUnitAscWordAsc(cleanLevel);
        List<Integer> units = wordRepository.findUnitsByLevel(cleanLevel);

        // Fetch completed stages
        List<UserVocabularyUnitProgress> unitProgs = unitProgressRepository.findByUserIdAndLevel(userId, cleanLevel);
        Map<Integer, Integer> stageMap = new HashMap<>();
        for (UserVocabularyUnitProgress p : unitProgs) {
            stageMap.put(p.getUnit(), p.getStageCompleted());
        }

        UserVocabularySettings settings = getOrCreateSettings(userId);
        
        // Premium check based on roles, coins, or active subscription pack
        boolean actualPremium = isPremium || 
                                userSubscriptionRepository.findFirstByUserIdAndIsActiveTrueOrderByExpiresAtDesc(userId).isPresent();

        List<Map<String, Object>> roadmapUnits = new ArrayList<>();
        
        // Unlocking rule:
        // Premium users: Unlock ALL units immediately.
        // Free users: Unit 1 unlocked. Subsequent units unlock 24 hours after completion (stage = 3) of previous unit.
        
        boolean previousUnitCompleted = true;
        LocalDateTime prevCompletionTime = null;

        for (int i = 0; i < units.size(); i++) {
            int unitNum = units.get(i);
            int completedStage = stageMap.getOrDefault(unitNum, 0);

            Map<String, Object> uMap = new HashMap<>();
            uMap.put("unit", unitNum);
            uMap.put("stage_completed", completedStage);
            
            // Count total words in unit
            long count = allWords.stream().filter(w -> w.getUnit() == unitNum).count();
            uMap.put("total_words", count);

            boolean isUnlocked = false;
            long remainingSeconds = 0;

            if (unitNum == 1 || actualPremium) {
                isUnlocked = true;
            } else {
                // Check if previous unit is completed
                Integer prevUnitNum = units.get(i - 1);
                Optional<UserVocabularyUnitProgress> prevProgOpt = unitProgressRepository.findByUserIdAndLevelAndUnit(userId, cleanLevel, prevUnitNum);
                
                if (prevProgOpt.isPresent() && prevProgOpt.get().getStageCompleted() == 3) {
                    LocalDateTime completedAt = prevProgOpt.get().getCompletedAt();
                    if (completedAt != null) {
                        LocalDateTime unlockTime = completedAt.plusDays(1); // 24 hours lock
                        LocalDateTime now = LocalDateTime.now();
                        if (now.isAfter(unlockTime)) {
                            isUnlocked = true;
                        } else {
                            isUnlocked = false;
                            remainingSeconds = ChronoUnit.SECONDS.between(now, unlockTime);
                        }
                    }
                } else {
                    isUnlocked = false;
                }
            }

            uMap.put("is_unlocked", isUnlocked);
            uMap.put("remaining_seconds", remainingSeconds);
            roadmapUnits.add(uMap);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("level", level);
        result.put("daily_goal", settings.getDailyGoal());
        result.put("current_streak", settings.getCurrentStreak());
        result.put("longest_streak", settings.getLongestStreak());
        result.put("vocabulary_title", settings.getVocabularyTitle());
        result.put("units", roadmapUnits);
        return result;
    }

    // ─── LESSON STAGE PROGRESS ──────────────────────────────────────────────

    @Transactional
    public Map<String, Object> submitStageProgress(UUID userId, String level, Integer unit, Integer stage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String cleanLevel = (level != null) ? level.trim().toUpperCase() : "A1";
        
        UserVocabularyUnitProgress progress = unitProgressRepository.findByUserIdAndLevelAndUnit(userId, cleanLevel, unit)
                .orElseGet(() -> UserVocabularyUnitProgress.builder()
                        .user(user)
                        .level(cleanLevel)
                        .unit(unit)
                        .stageCompleted(0)
                        .build());

        int prevStage = progress.getStageCompleted();
        int coinsEarned = 0;
        int xpEarned = 0;

        if (stage > prevStage) {
            progress.setStageCompleted(stage);
            if (stage == 3) {
                progress.setCompletedAt(LocalDateTime.now());
            }
            unitProgressRepository.save(progress);

            // Award logic
            if (stage == 1) { // LEARN
                coinsEarned = 10;
                xpEarned = 7;
            } else if (stage == 2) { // WRITE
                coinsEarned = 7;
                xpEarned = 5;
            } else if (stage == 3) { // SPEAK
                coinsEarned = 10;
                xpEarned = 8;
            }

            // Update user balance
            user.setCoins((user.getCoins() != null ? user.getCoins() : 0L) + coinsEarned);
            user.setXp((user.getXp() != null ? user.getXp() : 0L) + xpEarned);
            userRepository.save(user);

            // Record coin transaction
            CoinTransaction tx = CoinTransaction.builder()
                    .student(user)
                    .amount(coinsEarned)
                    .reason("Vocabulary " + level + " Unit " + unit + " Stage " + stage)
                    .source("VOCABULARY")
                    .organization(user.getOrganizationId() != null ? 
                            Organization.builder().id(user.getOrganizationId()).build() : 
                            null)
                    .build();
            coinTransactionRepository.save(tx);

            // Record XP transaction
            XpTransaction xpTx = XpTransaction.builder()
                    .user(user)
                    .amount((long) xpEarned)
                    .build();
            xpTransactionRepository.save(xpTx);

            // Record practice session minutes
            double minutesSpent = 0.0;
            if (stage == 1) {
                minutesSpent = 5.0;
            } else if (stage == 2) {
                minutesSpent = 7.0;
            } else if (stage == 3) {
                minutesSpent = 10.0;
            }

            if (minutesSpent > 0.0) {
                PracticeSession session = PracticeSession.builder()
                        .user(user)
                        .minutes(minutesSpent)
                        .build();
                practiceSessionRepository.save(session);
            }

            // Register words in SRS
            List<VocabularyWord> unitWords = wordRepository.findByLevelAndUnitOrderByWordAsc(level, unit);
            for (VocabularyWord w : unitWords) {
                UserVocabularyProgress wordProg = progressRepository.findByUserIdAndWordId(userId, w.getId())
                        .orElseGet(() -> UserVocabularyProgress.builder()
                                .user(user)
                                .word(w)
                                .status(WordStatus.NEW)
                                .build());
                
                if (stage == 1 && wordProg.getStatus() == WordStatus.NEW) {
                    wordProg.setStatus(WordStatus.LEARNING);
                    wordProg.setLastReviewedAt(LocalDateTime.now());
                    wordProg.setNextReviewAt(LocalDateTime.now().plusDays(1)); // Schedule 1 day review
                    progressRepository.save(wordProg);
                }
            }

            // Streak updates & settings recording
            UserVocabularySettings settings = getOrCreateSettings(userId);
            LocalDate today = LocalDate.now();
            if (settings.getLastActivityDate() == null) {
                settings.setCurrentStreak(1);
                settings.setLongestStreak(1);
            } else {
                long daysDiff = ChronoUnit.DAYS.between(settings.getLastActivityDate(), today);
                if (daysDiff == 1) {
                    settings.setCurrentStreak(settings.getCurrentStreak() + 1);
                    if (settings.getCurrentStreak() > settings.getLongestStreak()) {
                        settings.setLongestStreak(settings.getCurrentStreak());
                    }
                } else if (daysDiff > 1) {
                    settings.setCurrentStreak(1);
                }
            }
            settings.setLastActivityDate(today);
            settings.setTotalMinutesStudied(settings.getTotalMinutesStudied() + (stage == 1 ? 5.0 : 3.0));
            
            // Re-evaluate title
            long masteredCount = progressRepository.countByUserIdAndStatus(userId, WordStatus.MASTERED);
            if (masteredCount >= 500) settings.setVocabularyTitle("Vocabulary King");
            else if (masteredCount >= 200) settings.setVocabularyTitle("Writing Master");
            else if (masteredCount >= 50) settings.setVocabularyTitle("Perfect Speaker");
            else if (masteredCount >= 10) settings.setVocabularyTitle("Top Learner");
            
            settingsRepository.save(settings);

            // Achievements trigger checks
            checkAndUnlockAchievements(user, masteredCount, settings.getCurrentStreak());
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("coins_earned", coinsEarned);
        res.put("xp_earned", xpEarned);
        res.put("new_stage", progress.getStageCompleted());
        return res;
    }

    private void checkAndUnlockAchievements(User user, long masteredCount, int streak) {
        triggerUnlock(user, "LEARN_100", masteredCount >= 100);
        triggerUnlock(user, "LEARN_500", masteredCount >= 500);
        triggerUnlock(user, "LEARN_1000", masteredCount >= 1000);
        triggerUnlock(user, "STREAK_30", streak >= 30);
        triggerUnlock(user, "STREAK_100", streak >= 100);

        // CEFR levels completions
        triggerUnlock(user, "COMPLETE_A1", unitProgressRepository.countCompletedUnitsByLevel(user.getId(), "A1") >= 10); // assumed A1 has 10 units
        triggerUnlock(user, "COMPLETE_A2", unitProgressRepository.countCompletedUnitsByLevel(user.getId(), "A2") >= 10);
        triggerUnlock(user, "COMPLETE_B1", unitProgressRepository.countCompletedUnitsByLevel(user.getId(), "B1") >= 10);
    }

    private void triggerUnlock(User user, String code, boolean condition) {
        if (condition && achievementRepository.findByUserIdAndAchievementCode(user.getId(), code).isEmpty()) {
            UserVocabularyAchievement ach = UserVocabularyAchievement.builder()
                    .user(user)
                    .achievementCode(code)
                    .unlockedAt(LocalDateTime.now())
                    .build();
            achievementRepository.save(ach);

            notificationService.createNotification(
                    user,
                    "🏆 Yangi Yutuq!",
                    "Tabriklaymiz, siz \"" + code + "\" yutug'ini qo'lga kiritdingiz!",
                    NotificationType.INFO
            );
        }
    }

    // ─── SPACED REPETITION ENGINE ───────────────────────────────────────────

    public List<UserVocabularyProgress> getDueReviews(UUID userId) {
        return progressRepository.findDueReviews(userId, LocalDateTime.now());
    }

    @Transactional
    public Map<String, Object> submitReviewResult(UUID userId, UUID wordProgId, boolean correct, String difficultyRating) {
        UserVocabularyProgress p = progressRepository.findById(wordProgId)
                .orElseThrow(() -> new RuntimeException("Progress record not found"));

        if (!p.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        p.setTimesReviewed(p.getTimesReviewed() + 1);
        p.setLastReviewedAt(LocalDateTime.now());

        // Simple SuperMemo SM-2 Interval Calculation
        double ef = p.getEaseFactor();
        int interval = p.getIntervalDays();

        if (correct) {
            // Quality mapping: EASY=5, MEDIUM=4, HARD=3
            int quality = 4;
            if ("EASY".equalsIgnoreCase(difficultyRating)) quality = 5;
            else if ("HARD".equalsIgnoreCase(difficultyRating)) quality = 3;

            ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            if (ef < 1.3) ef = 1.3;

            if (interval == 1) {
                interval = 3;
            } else if (interval == 3) {
                interval = 7;
            } else {
                interval = (int) Math.round(interval * ef);
            }

            p.setTimesCorrectWriting(p.getTimesCorrectWriting() + 1);

            // Promote status
            if (p.getStatus() == WordStatus.LEARNING) {
                p.setStatus(WordStatus.REVIEW);
            } else if (p.getStatus() == WordStatus.REVIEW && interval >= 14) {
                p.setStatus(WordStatus.MASTERED);
            }
        } else {
            // Reset interval
            ef = ef - 0.2;
            if (ef < 1.3) ef = 1.3;
            interval = 1;
            p.setStatus(WordStatus.LEARNING);
        }

        p.setTimesTotalWriting(p.getTimesTotalWriting() + 1);
        p.setEaseFactor(ef);
        p.setIntervalDays(interval);
        p.setNextReviewAt(LocalDateTime.now().plusDays(interval));
        progressRepository.save(p);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("new_status", p.getStatus().name());
        res.put("next_review_days", interval);
        return res;
    }

    public List<UserVocabularyProgress> getWeakWords(UUID userId) {
        return progressRepository.findWeakWords(userId, PageRequest.of(0, 10));
    }

    // ─── BOOKMARKS & FAVORITES ───────────────────────────────────────────────

    @Transactional
    public Map<String, Object> toggleBookmark(UUID userId, UUID wordId) {
        UserVocabularyProgress p = getOrCreateWordProgress(userId, wordId);
        p.setIsBookmarked(!p.getIsBookmarked());
        progressRepository.save(p);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("is_bookmarked", p.getIsBookmarked());
        return res;
    }

    @Transactional
    public Map<String, Object> toggleFavorite(UUID userId, UUID wordId) {
        UserVocabularyProgress p = getOrCreateWordProgress(userId, wordId);
        p.setIsFavorite(!p.getIsFavorite());
        progressRepository.save(p);

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("is_favorite", p.getIsFavorite());
        return res;
    }

    public List<UserVocabularyProgress> getBookmarks(UUID userId) {
        return progressRepository.findBookmarksByUserId(userId);
    }

    public List<UserVocabularyProgress> getFavorites(UUID userId) {
        return progressRepository.findFavoritesByUserId(userId);
    }

    private UserVocabularyProgress getOrCreateWordProgress(UUID userId, UUID wordId) {
        return progressRepository.findByUserIdAndWordId(userId, wordId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    VocabularyWord word = wordRepository.findById(wordId)
                            .orElseThrow(() -> new RuntimeException("Word not found"));
                    return UserVocabularyProgress.builder()
                            .user(user)
                            .word(word)
                            .status(WordStatus.NEW)
                            .build();
                });
    }

    // ─── AI HELPERS (GEMINI) ────────────────────────────────────────────────

    public Map<String, Object> generateWordDataAI(String word, String level) {
        String prompt = "You are a professional English lexicographer. Provide detailed vocabulary details for the word '" + word + "' at CEFR level '" + level + "'. " +
                "Output ONLY raw JSON format: {\"translation\": \"O'zbekcha tarjimasi\", \"ipa_us\": \"ipa US\", \"ipa_uk\": \"ipa UK\", " +
                "\"part_of_speech\": \"e.g. verb, noun\", \"definition\": \"English definition\", " +
                "\"example_sentence\": \"English example sentence\", \"uzbek_example\": \"Uzbek translation of example\", " +
                "\"synonyms\": \"syn1, syn2, syn3\", \"antonyms\": \"ant1, ant2, ant3\", \"collocations\": \"coll1; coll2; coll3\", " +
                "\"common_mistakes\": \"Tushuntirish va xatolar...\", \"pronunciation_tips\": \"Talaffuz bo'yicha maslahat...\", " +
                "\"category\": \"Category name (e.g. Travel, Technology, Business)\"}";

        try {
            String jsonRes = geminiService.executeWithRotation(prompt, 3);
            JsonNode root = objectMapper.readTree(jsonRes);
            
            Map<String, Object> map = new HashMap<>();
            map.put("word", word);
            map.put("level", level);
            map.put("translation", root.path("translation").asText(""));
            map.put("ipa_us", root.path("ipa_us").asText(""));
            map.put("ipa_uk", root.path("ipa_uk").asText(""));
            map.put("part_of_speech", root.path("part_of_speech").asText(""));
            map.put("definition", root.path("definition").asText(""));
            map.put("example_sentence", root.path("example_sentence").asText(""));
            map.put("uzbek_example", root.path("uzbek_example").asText(""));
            map.put("synonyms", root.path("synonyms").asText(""));
            map.put("antonyms", root.path("antonyms").asText(""));
            map.put("collocations", root.path("collocations").asText(""));
            map.put("common_mistakes", root.path("common_mistakes").asText(""));
            map.put("pronunciation_tips", root.path("pronunciation_tips").asText(""));
            map.put("category", root.path("category").asText("Other"));

            return map;
        } catch (Exception e) {
            log.error("Failed to generate AI data for {}: {}", word, e.getMessage());
            throw new RuntimeException("AI word generation failed: " + e.getMessage());
        }
    }

    @Transactional
    public Map<String, Object> evaluateSpeech(UUID userId, UUID wordId, String transcription) {
        VocabularyWord w = wordRepository.findById(wordId)
                .orElseThrow(() -> new RuntimeException("Word not found"));

        String prompt = "You are an expert pronunciation coach. A student tried to pronounce the word '" + w.getWord() + "'. " +
                "The speech recognizer transcribed it as '" + transcription + "'. " +
                "Evaluate the pronunciation accuracy (0-100), stress (0-100), intonation (0-100), and fluency (0-100). " +
                "Highlight any missing or wrong sounds, and provide constructive feedback in UZBEK (masalan: 'TH tovushini yaxshiroq talaffuz qilishingiz kerak'). " +
                "Output ONLY raw JSON format: {\"score\": 85, \"stress_score\": 90, \"intonation_score\": 80, \"fluency_score\": 85, " +
                "\"missing_sounds\": [\"l\"], \"wrong_sounds\": [\"o\"], \"feedback\": \"Tavsiya matni...\", \"verdict\": \"Excellent|Good|Needs Practice\"}";

        try {
            String jsonRes = geminiService.executeWithRotation(prompt, 3);
            JsonNode root = objectMapper.readTree(jsonRes);

            // Record average speaking accuracy
            double score = root.path("score").asDouble(0.0);
            UserVocabularyProgress p = getOrCreateWordProgress(userId, w.getId());
            p.setTimesReviewed(p.getTimesReviewed() + 1);
            p.setSpeakingAccuracyAvg((p.getSpeakingAccuracyAvg() * (p.getTimesReviewed() - 1) + score) / p.getTimesReviewed());
            progressRepository.save(p);

            Map<String, Object> map = new HashMap<>();
            map.put("score", score);
            map.put("stress_score", root.path("stress_score").asDouble(0.0));
            map.put("intonation_score", root.path("intonation_score").asDouble(0.0));
            map.put("fluency_score", root.path("fluency_score").asDouble(0.0));
            map.put("feedback", root.path("feedback").asText(""));
            map.put("verdict", root.path("verdict").asText("Needs Practice"));
            
            List<String> missing = new ArrayList<>();
            root.path("missing_sounds").forEach(n -> missing.add(n.asText()));
            map.put("missing_sounds", missing);

            List<String> wrong = new ArrayList<>();
            root.path("wrong_sounds").forEach(n -> wrong.add(n.asText()));
            map.put("wrong_sounds", wrong);

            return map;
        } catch (Exception e) {
            log.error("Failed speech check for {}: {}", w.getWord(), e.getMessage());
            
            // Return intelligent browser fallback if Gemini is overloaded
            double fallbackScore = transcription.trim().equalsIgnoreCase(w.getWord().trim()) ? 95.0 : 45.0;
            Map<String, Object> map = new HashMap<>();
            map.put("score", fallbackScore);
            map.put("stress_score", fallbackScore);
            map.put("intonation_score", fallbackScore);
            map.put("fluency_score", fallbackScore);
            map.put("feedback", fallbackScore > 80 ? "Yaxshi talaffuz!" : "Qaytadan urinib ko'ring, tovushlarda xatolik bor.");
            map.put("verdict", fallbackScore > 80 ? "Excellent" : "Needs Practice");
            map.put("missing_sounds", Collections.emptyList());
            map.put("wrong_sounds", Collections.emptyList());
            return map;
        }
    }

    // ─── EXPORT & IMPORT UTILITIES ──────────────────────────────────────────

    public byte[] exportCsv() {
        List<VocabularyWord> words = wordRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("Word,Translation,IPA US,IPA UK,Part of Speech,Definition,Example Sentence,Uzbek Example,Image,Audio US,Audio UK,Level,Unit,Synonyms,Antonyms,Collocations,Common Mistakes,Pronunciation Tips,Category\n");
        
        for (VocabularyWord w : words) {
            sb.append(escapeCsv(w.getWord())).append(",")
              .append(escapeCsv(w.getTranslation())).append(",")
              .append(escapeCsv(w.getIpaUs())).append(",")
              .append(escapeCsv(w.getIpaUk())).append(",")
              .append(escapeCsv(w.getPartOfSpeech())).append(",")
              .append(escapeCsv(w.getDefinition())).append(",")
              .append(escapeCsv(w.getExampleSentence())).append(",")
              .append(escapeCsv(w.getUzbekExample())).append(",")
              .append(escapeCsv(w.getImageUrl())).append(",")
              .append(escapeCsv(w.getAudioUsUrl())).append(",")
              .append(escapeCsv(w.getAudioUkUrl())).append(",")
              .append(escapeCsv(w.getLevel())).append(",")
              .append(w.getUnit()).append(",")
              .append(escapeCsv(w.getSynonyms())).append(",")
              .append(escapeCsv(w.getAntonyms())).append(",")
              .append(escapeCsv(w.getCollocations())).append(",")
              .append(escapeCsv(w.getCommonMistakes())).append(",")
              .append(escapeCsv(w.getPronunciationTips())).append(",")
              .append(escapeCsv(w.getCategory())).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional
    public void importCsv(MultipartFile file, String forcedLevel) throws IOException {
        String csvContent = new String(file.getBytes(), StandardCharsets.UTF_8);
        List<String[]> lines = parseCsv(csvContent);

        if (lines.isEmpty()) return;

        // Default indices mapping (positional fallback if no header matches)
        int wordIdx = 0;
        int transIdx = 1;
        int ipaUsIdx = 2;
        int ipaUkIdx = 3;
        int posIdx = 4;
        int defIdx = 5;
        int exIdx = 6;
        int uzExIdx = 7;
        int imgIdx = 8;
        int audUsIdx = 9;
        int audUkIdx = 10;
        int lvlIdx = 11;
        int unitIdx = 12;
        int synIdx = 13;
        int antIdx = 14;
        int collIdx = 15;
        int mistakeIdx = 16;
        int tipsIdx = 17;
        int catIdx = 18;

        String[] firstRow = lines.get(0);
        boolean hasHeader = false;

        // Scan first row to check if it's a header
        for (String cell : firstRow) {
            String clean = cell.toLowerCase().trim();
            if (clean.equals("word") || clean.equals("english") || clean.equals("translation") || 
                clean.equals("uzbek") || clean.equals("ipa") || clean.equals("example") || 
                clean.equals("definition")) {
                hasHeader = true;
                break;
            }
        }

        int startIndex = 0;
        if (hasHeader) {
            startIndex = 1;
            // Initialize mapped indices to -1
            wordIdx = -1; transIdx = -1; ipaUsIdx = -1; ipaUkIdx = -1; posIdx = -1;
            defIdx = -1; exIdx = -1; uzExIdx = -1; imgIdx = -1; audUsIdx = -1;
            audUkIdx = -1; lvlIdx = -1; unitIdx = -1; synIdx = -1; antIdx = -1;
            collIdx = -1; mistakeIdx = -1; tipsIdx = -1; catIdx = -1;

            for (int c = 0; c < firstRow.length; c++) {
                String col = firstRow[c].toLowerCase().trim();
                if (col.equals("word") || col.equals("english")) {
                    wordIdx = c;
                } else if (col.equals("translation") || col.equals("uzbek")) {
                    transIdx = c;
                } else if (col.equals("ipa") || col.equals("ipa_us") || col.equals("ipa us") || col.equals("pronunciation")) {
                    ipaUsIdx = c;
                } else if (col.equals("ipa_uk") || col.equals("ipa uk")) {
                    ipaUkIdx = c;
                } else if (col.equals("pos") || col.equals("part_of_speech") || col.equals("part of speech") || col.equals("partofspeech")) {
                    posIdx = c;
                } else if (col.equals("definition")) {
                    defIdx = c;
                } else if (col.equals("example") || col.equals("example_sentence") || col.equals("example sentence") || col.equals("sentence")) {
                    exIdx = c;
                } else if (col.equals("uzbek_example") || col.equals("uzbek example") || col.equals("translation_example")) {
                    uzExIdx = c;
                } else if (col.equals("image") || col.equals("image_url") || col.equals("image url")) {
                    imgIdx = c;
                } else if (col.equals("audio") || col.equals("audio_us") || col.equals("audio us")) {
                    audUsIdx = c;
                } else if (col.equals("audio_uk") || col.equals("audio uk")) {
                    audUkIdx = c;
                } else if (col.equals("level")) {
                    lvlIdx = c;
                } else if (col.equals("unit")) {
                    unitIdx = c;
                } else if (col.equals("synonyms")) {
                    synIdx = c;
                } else if (col.equals("antonyms")) {
                    antIdx = c;
                } else if (col.equals("collocations")) {
                    collIdx = c;
                } else if (col.equals("common_mistakes") || col.equals("common mistakes")) {
                    mistakeIdx = c;
                } else if (col.equals("pronunciation_tips") || col.equals("pronunciation tips")) {
                    tipsIdx = c;
                } else if (col.equals("category")) {
                    catIdx = c;
                }
            }
        }

        for (int i = startIndex; i < lines.size(); i++) {
            String[] row = lines.get(i);
            // Must have word and translation fields mapped and not empty
            if (wordIdx < 0 || transIdx < 0) continue;
            if (row.length <= wordIdx || row.length <= transIdx) continue;

            String word = row[wordIdx];
            String translation = row[transIdx];
            if (word == null || word.trim().isEmpty() || translation == null || translation.trim().isEmpty()) {
                continue;
            }

            String ipaUs = (ipaUsIdx >= 0 && row.length > ipaUsIdx) ? row[ipaUsIdx] : "";
            String ipaUk = (ipaUkIdx >= 0 && row.length > ipaUkIdx) ? row[ipaUkIdx] : "";
            String partOfSpeech = (posIdx >= 0 && row.length > posIdx) ? row[posIdx] : "";
            String definition = (defIdx >= 0 && row.length > defIdx) ? row[defIdx] : "";
            String exampleSentence = (exIdx >= 0 && row.length > exIdx) ? row[exIdx] : "";
            String uzbekExample = (uzExIdx >= 0 && row.length > uzExIdx) ? row[uzExIdx] : "";
            String imageUrl = (imgIdx >= 0 && row.length > imgIdx) ? row[imgIdx] : "";
            String audioUsUrl = (audUsIdx >= 0 && row.length > audUsIdx) ? row[audUsIdx] : "";
            String audioUkUrl = (audUkIdx >= 0 && row.length > audUkIdx) ? row[audUkIdx] : "";
            String level = (lvlIdx >= 0 && row.length > lvlIdx) ? row[lvlIdx] : forcedLevel;
            int unit = 1;
            if (unitIdx >= 0 && row.length > unitIdx && !row[unitIdx].isEmpty()) {
                try { 
                    unit = Integer.parseInt(row[unitIdx].trim()); 
                    if (unit <= 1 && lines.size() > 20) {
                        // If they marked everything as unit 1, but we have many words, let's distribute them!
                        unit = (i - startIndex) / 20 + 1;
                    }
                } catch (Exception e) {
                    unit = (i - startIndex) / 20 + 1;
                }
            } else {
                unit = (i - startIndex) / 20 + 1;
            }
            String synonyms = (synIdx >= 0 && row.length > synIdx) ? row[synIdx] : "";
            String antonyms = (antIdx >= 0 && row.length > antIdx) ? row[antIdx] : "";
            String collocations = (collIdx >= 0 && row.length > collIdx) ? row[collIdx] : "";
            String commonMistakes = (mistakeIdx >= 0 && row.length > mistakeIdx) ? row[mistakeIdx] : "";
            String pronunciationTips = (tipsIdx >= 0 && row.length > tipsIdx) ? row[tipsIdx] : "";
            String category = (catIdx >= 0 && row.length > catIdx) ? row[catIdx] : "General";

            // Level validation
            if (level == null || level.trim().isEmpty()) {
                level = forcedLevel != null ? forcedLevel : "A1";
            }

            Optional<VocabularyWord> existingOpt = wordRepository.findByWordIgnoreCase(word);
            VocabularyWord vocabWord = existingOpt.orElseGet(() -> VocabularyWord.builder().word(word).build());

            vocabWord.setTranslation(translation);
            vocabWord.setIpaUs(ipaUs);
            vocabWord.setIpaUk(ipaUk);
            vocabWord.setPartOfSpeech(partOfSpeech);
            vocabWord.setDefinition(definition);
            vocabWord.setExampleSentence(exampleSentence);
            vocabWord.setUzbekExample(uzbekExample);
            vocabWord.setImageUrl(imageUrl);
            vocabWord.setAudioUsUrl(audioUsUrl);
            vocabWord.setAudioUkUrl(audioUkUrl);
            vocabWord.setLevel(level);
            vocabWord.setUnit(unit);
            vocabWord.setSynonyms(synonyms);
            vocabWord.setAntonyms(antonyms);
            vocabWord.setCollocations(collocations);
            vocabWord.setCommonMistakes(commonMistakes);
            vocabWord.setPronunciationTips(pronunciationTips);
            vocabWord.setCategory(category);

            wordRepository.save(vocabWord);
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    private List<String[]> parseCsv(String csvContent) {
        List<String[]> lines = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new StringReader(csvContent))) {
            String line;
            while ((line = br.readLine()) != null) {
                List<String> row = new ArrayList<>();
                boolean inQuotes = false;
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < line.length(); i++) {
                    char c = line.charAt(i);
                    if (c == '"') {
                        inQuotes = !inQuotes;
                    } else if (c == ',' && !inQuotes) {
                        row.add(sb.toString().trim());
                        sb.setLength(0);
                    } else {
                        sb.append(c);
                    }
                }
                row.add(sb.toString().trim());
                lines.add(row.toArray(new String[0]));
            }
        } catch (IOException e) {
            log.error("Failed to parse CSV: {}", e.getMessage());
        }
        return lines;
    }

    // ─── CHEST REWARDS CLAIM ────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> claimChest(UUID userId, String chestType) {
        UserVocabularySettings settings = getOrCreateSettings(userId);
        User user = settings.getUser();
        String claimed = settings.getClaimedChests() != null ? settings.getClaimedChests() : "";
        Set<String> claimedList = new HashSet<>(Arrays.asList(claimed.split(",")));

        // Chest details: DAILY, WEEKLY, MONTHLY
        String chestKey = chestType.toUpperCase() + "_" + LocalDate.now();
        if ("WEEKLY".equalsIgnoreCase(chestType)) {
            chestKey = "WEEKLY_" + LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
        } else if ("MONTHLY".equalsIgnoreCase(chestType)) {
            chestKey = "MONTHLY_" + LocalDate.now().withDayOfMonth(1);
        }

        if (claimedList.contains(chestKey)) {
            throw new RuntimeException("Siz bu chestni qabul qilib bo'lgansiz!");
        }

        int coins = 0;
        int xp = 0;
        if ("DAILY".equalsIgnoreCase(chestType)) {
            coins = 15;
            xp = 10;
        } else if ("WEEKLY".equalsIgnoreCase(chestType)) {
            coins = 100;
            xp = 75;
        } else if ("MONTHLY".equalsIgnoreCase(chestType)) {
            coins = 400;
            xp = 300;
        }

        user.setCoins((user.getCoins() != null ? user.getCoins() : 0L) + coins);
        user.setXp((user.getXp() != null ? user.getXp() : 0L) + xp);
        userRepository.save(user);

        // Save claimed key
        claimedList.add(chestKey);
        settings.setClaimedChests(String.join(",", claimedList));
        settingsRepository.save(settings);

        // Record transaction
        CoinTransaction tx = CoinTransaction.builder()
                .student(user)
                .amount(coins)
                .reason("Vocabulary Gamification Chest: " + chestType)
                .source("VOCABULARY_CHEST")
                .organization(user.getOrganizationId() != null ? 
                        Organization.builder().id(user.getOrganizationId()).build() : 
                        null)
                .build();
        coinTransactionRepository.save(tx);

        // Record XP transaction
        XpTransaction xpTx = XpTransaction.builder()
                .user(user)
                .amount((long) xp)
                .build();
        xpTransactionRepository.save(xpTx);

        notificationService.createNotification(
                user,
                "🎁 Xazina Sandig'i!",
                "Siz \"" + chestType + "\" sandig'ini ochib, " + coins + " Coin va " + xp + " XP ga ega bo'ldingiz!",
                NotificationType.INFO
        );

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("coins", coins);
        res.put("xp", xp);
        return res;
    }

    // ─── INTERACTIVE CHARTS / STATISTICS ─────────────────────────────────────

    @Transactional
    public Map<String, Object> getDashboardStats(UUID userId) {
        long wordsLearned = progressRepository.countLearnedWords(userId);
        long mastered = progressRepository.countByUserIdAndStatus(userId, WordStatus.MASTERED);
        long learning = progressRepository.countByUserIdAndStatus(userId, WordStatus.LEARNING);
        long reviews = progressRepository.countByUserIdAndStatus(userId, WordStatus.REVIEW);

        Double avgSpeaking = progressRepository.getAverageSpeakingAccuracy(userId);
        if (avgSpeaking == null) avgSpeaking = 0.0;

        List<Object[]> writingRaw = progressRepository.getWritingAccuracyStats(userId);
        double writingAccuracy = 0.0;
        if (!writingRaw.isEmpty() && writingRaw.get(0)[1] != null) {
            long correct = ((Number) writingRaw.get(0)[0]).longValue();
            long total = ((Number) writingRaw.get(0)[1]).longValue();
            if (total > 0) {
                writingAccuracy = (double) correct / total * 100.0;
            }
        }

        UserVocabularySettings settings = getOrCreateSettings(userId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("words_learned", wordsLearned);
        stats.put("mastered_words", mastered);
        stats.put("learning_words", learning);
        stats.put("review_words", reviews);
        stats.put("speaking_accuracy", avgSpeaking);
        stats.put("writing_accuracy", writingAccuracy);
        stats.put("streak", settings.getCurrentStreak());
        stats.put("longest_streak", settings.getLongestStreak());
        stats.put("minutes_studied", settings.getTotalMinutesStudied());
        stats.put("coins", settings.getUser().getCoins() != null ? settings.getUser().getCoins() : 0L);
        stats.put("xp", settings.getUser().getXp() != null ? settings.getUser().getXp() : 0L);
        stats.put("vocabulary_title", settings.getVocabularyTitle());

        // Dummy retention, reviews and activity arrays for dashboard charting fallbacks
        stats.put("learning_speed_chart", Arrays.asList(
                Map.of("name", "Mon", "words", 5),
                Map.of("name", "Tue", "words", 8),
                Map.of("name", "Wed", "words", 12),
                Map.of("name", "Thu", "words", 15),
                Map.of("name", "Fri", "words", 18),
                Map.of("name", "Sat", "words", 22),
                Map.of("name", "Sun", "words", 25)
        ));
        stats.put("retention_rate_chart", Arrays.asList(
                Map.of("name", "Day 1", "rate", 100),
                Map.of("name", "Day 3", "rate", 92),
                Map.of("name", "Day 7", "rate", 85),
                Map.of("name", "Day 14", "rate", 79),
                Map.of("name", "Day 30", "rate", 75)
        ));
        return stats;
    }
}
