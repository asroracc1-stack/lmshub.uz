package com.lmscrm.backend.bot;

import com.lmscrm.backend.bot.enums.BotState;
import com.lmscrm.backend.bot.util.BotConstants;
import com.lmscrm.backend.bot.util.KeyboardFactory;
import com.lmscrm.backend.domain.entity.BotUserState;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.repository.BotReviewRepository;
import com.lmscrm.backend.repository.BotUserStateRepository;
import com.lmscrm.backend.repository.ExamRepository;
import com.lmscrm.backend.repository.StudentAnswerRepository;
import com.lmscrm.backend.repository.StudentAttemptRepository;
import com.lmscrm.backend.repository.SubscriptionPackRepository;
import com.lmscrm.backend.repository.SubscriptionRequestRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.QuestionRepository;
import com.lmscrm.backend.security.JwtTokenProvider;
import com.lmscrm.backend.service.TelegramBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class TelegramBotDispatcher {

    private final TelegramBotService telegramBotService;
    private final BotUserStateRepository stateRepository;
    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final StudentAttemptRepository attemptRepository;
    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final SubscriptionPackRepository packRepository;
    private final SubscriptionRequestRepository subscriptionRequestRepository;
    private final BotReviewRepository botReviewRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${telegram.bot.token}")
    private String botToken;

    @Value("${telegram.bot.chat-id:7499973776}")
    private String adminChatId;

    public void dispatch(Map<String, Object> update) {
        try {
            if (update.containsKey("message")) {
                handleMessage((Map<String, Object>) update.get("message"));
            } else if (update.containsKey("callback_query")) {
                handleCallbackQuery((Map<String, Object>) update.get("callback_query"));
            }
        } catch (Exception e) {
            log.error("Error dispatching telegram update: ", e);
        }
    }

    private void handleMessage(Map<String, Object> message) {
        Map<String, Object> from = (Map<String, Object>) message.get("from");
        Map<String, Object> chat = (Map<String, Object>) message.get("chat");

        if (from == null || chat == null) return;

        String chatId = String.valueOf(chat.get("id"));
        String text = (String) message.get("text");

        // Process contact
        if (message.containsKey("contact")) {
            Map<String, Object> contact = (Map<String, Object>) message.get("contact");
            handleContact(chatId, contact);
            return;
        }

        BotUserState state = getOrCreateState(chatId);

        // Process photo
        if (message.containsKey("photo")) {
            java.util.List<Map<String, Object>> photos = (java.util.List<Map<String, Object>>) message.get("photo");
            if (photos != null && !photos.isEmpty()) {
                handlePhoto(chatId, photos, state);
            }
            return;
        }

        if (text == null) return;

        // Global commands
        if (text.startsWith("/start")) {
            handleStart(chatId, state, text);
            return;
        }
        
        if ("/admin_panel".equals(text)) {
            handleAdminPanel(chatId);
            return;
        }

        // Before doing anything else, check subscription
        if (!isSubscribed(chatId)) {
            sendSubscriptionRequired(chatId);
            return;
        }

        // State Machine Routing
        switch (state.getState()) {
            case AWAITING_NAME:
                handleNameInput(chatId, text, state);
                break;
            case AWAITING_PHONE:
                sendMessageWithMarkup(chatId, BotConstants.MSG_ASK_PHONE, KeyboardFactory.createPhoneRequestMenu());
                break;
            case AWAITING_CATEGORY:
                handleCategoryInput(chatId, text, state);
                break;
            case AWAITING_REVIEW:
                handleReviewInput(chatId, text, state);
                break;
            case MAIN_MENU:
                handleMainMenu(chatId, text, state);
                break;
            default:
                sendMainMenu(chatId, state);
                break;
        }
    }

    private void handleCallbackQuery(Map<String, Object> callbackQuery) {
        String queryId = (String) callbackQuery.get("id");
        String data = (String) callbackQuery.get("data");
        Map<String, Object> message = (Map<String, Object>) callbackQuery.get("message");
        if (message == null || data == null) return;

        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        String chatId = String.valueOf(chat.get("id"));

        BotUserState state = getOrCreateState(chatId);

        if ("check_sub".equals(data)) {
            if (isSubscribed(chatId)) {
                telegramBotService.answerCallbackQuery(queryId, "✅ Obuna tasdiqlandi!", true);
                // Remove inline keyboard by editing message text
                Integer messageId = (Integer) message.get("message_id");
                telegramBotService.editMessageText(Long.parseLong(chatId), messageId, "✅ Obuna tasdiqlandi!");
                
                // Continue registration flow
                if (state.getState() == BotState.START) {
                    state.setState(BotState.AWAITING_NAME);
                    stateRepository.save(state);
                    telegramBotService.sendMessageTo(chatId, BotConstants.MSG_ASK_NAME);
                } else {
                    sendMainMenu(chatId, state);
                }
            } else {
                telegramBotService.answerCallbackQuery(queryId, "❌ Hali obuna bo'lmadingiz!", true);
            }
            return;
        }

        if (data.startsWith("exam_")) {
            String examIdStr = data.substring(5);
            try {
                java.util.UUID examId = java.util.UUID.fromString(examIdStr);
                Optional<com.lmscrm.backend.domain.entity.Exam> examOpt = examRepository.findByIdWithPassages(examId);
                if (examOpt.isPresent()) {
                    com.lmscrm.backend.domain.entity.Exam exam = examOpt.get();
                    
                    String emoji = BotConstants.EMOJI_FREE;
                    String packName = "Bepul";
                    if ("pro".equalsIgnoreCase(exam.getRequiredPack())) {
                        emoji = BotConstants.EMOJI_PRO;
                        packName = "PRO Obuna";
                    } else if ("elite".equalsIgnoreCase(exam.getRequiredPack())) {
                        emoji = BotConstants.EMOJI_ELITE;
                        packName = "ELITE Obuna";
                    }

                    int questionCount = questionRepository.countByExamId(examId);

                    String text = String.format("📄 <b>Test ma'lumoti</b>\n\n<b>Nomi:</b> %s\n<b>Savollar soni:</b> %s\n<b>Vaqt:</b> %s daqiqa\n<b>Turi:</b> %s %s\n\nBot orqali quyidagi tugmani bosib saytga kiring va testni yeching:",
                            exam.getTitle(), questionCount, exam.getDurationMinutes(), emoji, packName);

                    // Generate JWT token for deep linking
                    Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
                    if (userOpt.isEmpty()) {
                        telegramBotService.answerCallbackQuery(queryId, "Foydalanuvchi topilmadi", true);
                        return;
                    }
                    String token = jwtTokenProvider.generateTokenForUser(userOpt.get());
                    String link = telegramBotService.getSiteUrl() + "/auth/bot-login?token=" + token + "&redirect=/exam/" + examId;

                    java.util.List<java.util.List<Map<String, String>>> kb = new java.util.ArrayList<>();
                    
                    Map<String, String> startBtn = new HashMap<>();
                    startBtn.put("text", "🚀 Sinab ko'rish");
                    startBtn.put("url", link);
                    
                    kb.add(java.util.List.of(startBtn));

                    // Instead of new message, edit the current one or answer and send new
                    telegramBotService.answerCallbackQuery(queryId, "Test yuklanmoqda...", false);
                    sendMessageWithMarkup(chatId, text, KeyboardFactory.createInlineKeyboard(kb));

                } else {
                    telegramBotService.answerCallbackQuery(queryId, "Test topilmadi", true);
                }
            } catch (Exception e) {
                log.error("Error finding exam", e);
                telegramBotService.answerCallbackQuery(queryId, "Xatolik", true);
            }
            return;
        } else if (data.startsWith("analysis_")) {
            String attemptIdStr = data.substring(9);
            try {
                Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
                if (userOpt.isEmpty()) return;
                
                String token = jwtTokenProvider.generateTokenForUser(userOpt.get());
                String link = telegramBotService.getSiteUrl() + "/auth/bot-login?token=" + token + "&redirect=/student/results/" + attemptIdStr;

                java.util.List<java.util.List<Map<String, String>>> kb = new java.util.ArrayList<>();
                Map<String, String> linkBtn = new HashMap<>();
                linkBtn.put("text", "🌐 Saytda to'liq tahlilni ko'rish");
                linkBtn.put("url", link);
                kb.add(java.util.List.of(linkBtn));

                telegramBotService.answerCallbackQuery(queryId, "Saytga o'ting", false);
                sendMessageWithMarkup(chatId, "To'liq tahlilni saytimiz orqali ko'rishingiz mumkin:", KeyboardFactory.createInlineKeyboard(kb));

            } catch (Exception e) {
                log.error("Error generating analysis link", e);
                telegramBotService.answerCallbackQuery(queryId, "Xatolik", true);
            }
            return;
        } else if (data.startsWith("buy_pack_")) {
            String packIdStr = data.substring(9);
            state.setState(BotState.AWAITING_PAYMENT_RECEIPT);
            state.setSelectedPackId(packIdStr);
            stateRepository.save(state);

            String text = "Iltimos, to'lovni quyidagi karta raqamiga amalga oshiring va chek rasmini shu yerga yuboring:\n\n💳 <b>Karta raqami:</b> <code>9860 1701 0590 7738</code>\n👤 <b>Qabul qiluvchi:</b> Admin";
            telegramBotService.answerCallbackQuery(queryId, "To'lov", false);
            telegramBotService.sendMessageTo(chatId, text);
            return;
        }

        // Other callbacks... (e.g. payment)
        telegramBotService.answerCallbackQuery(queryId, "Tez orada ishga tushadi", false);
    }

    private void handleStart(String chatId, BotUserState state, String text) {
        state.setState(BotState.START);
        stateRepository.save(state);
        
        String[] parts = text.split(" ");
        if (parts.length > 1) {
            String refCode = parts[1];
            Optional<User> inviterOpt = userRepository.findAll().stream()
                    .filter(u -> refCode.equals(u.getReferralCode())).findFirst();
            if (inviterOpt.isPresent()) {
                // Keep track of who invited in state or create dummy user immediately
                Optional<User> currentUserOpt = userRepository.findByTelegramChatId(chatId);
                if (currentUserOpt.isEmpty()) {
                    User newUser = new User();
                    newUser.setTelegramChatId(chatId);
                    newUser.setUsername("tg_" + chatId);
                    newUser.setPassword("tg_" + chatId);
                    newUser.setEmail("tg_" + chatId + "@lmshub.uz");
                    newUser.setRole(AppRole.STUDENT);
                    newUser.setCoins(0L);
                    newUser.setActive(true);
                    newUser.setReferredBy(inviterOpt.get().getId());
                    userRepository.save(newUser);
                }
            }
        }
        
        if (!isSubscribed(chatId)) {
            sendSubscriptionRequired(chatId);
        } else {
            // Already subscribed, ask name or show menu based on registration
            Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
            if (userOpt.isPresent() && userOpt.get().getPhoneNumber() != null) {
                sendMainMenu(chatId, state);
            } else {
                state.setState(BotState.AWAITING_NAME);
                stateRepository.save(state);
                telegramBotService.sendMessageTo(chatId, BotConstants.MSG_ASK_NAME);
            }
        }
    }

    private void handleNameInput(String chatId, String name, BotUserState state) {
        try {
            // Create or update user
            User user = userRepository.findByTelegramChatId(chatId).orElseGet(() -> {
                User newUser = new User();
                newUser.setTelegramChatId(chatId);
                newUser.setUsername("tg_" + chatId);
                newUser.setPassword("tg_" + chatId); // dummy password
                newUser.setEmail("tg_" + chatId + "@lmshub.uz");
                newUser.setRole(AppRole.STUDENT);
                newUser.setCoins(0L);
                newUser.setActive(true);
                return newUser;
            });
            
            user.setFullName(name);
            userRepository.save(user);

            state.setState(BotState.AWAITING_PHONE);
            stateRepository.save(state);

            sendMessageWithMarkup(chatId, BotConstants.MSG_ASK_PHONE, KeyboardFactory.createPhoneRequestMenu());
        } catch (Exception e) {
            log.error("Error in handleNameInput", e);
            telegramBotService.sendMessageTo(chatId, "Xatolik yuz berdi: " + e.getMessage() + "\nCause: " + (e.getCause() != null ? e.getCause().getMessage() : "none"));
        }
    }

    private void handleContact(String chatId, Map<String, Object> contact) {
        BotUserState state = getOrCreateState(chatId);
        if (state.getState() != BotState.AWAITING_PHONE) {
            sendMainMenu(chatId, state);
            return;
        }

        String phone = (String) contact.get("phone_number");
        if (phone != null) {
            if (!phone.startsWith("+")) {
                phone = "+" + phone;
            }
            Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setPhoneNumber(phone);
                userRepository.save(user);
            }
        }

        sendMainMenu(chatId, state);
    }

    private void handleMainMenu(String chatId, String text, BotUserState state) {
        switch (text) {
            case BotConstants.BTN_START_TEST:
                state.setState(BotState.AWAITING_CATEGORY);
                stateRepository.save(state);
                sendMessageWithMarkup(chatId, BotConstants.MSG_SELECT_CATEGORY, KeyboardFactory.createCategoriesMenu());
                break;
            case BotConstants.BTN_MY_RESULTS:
                handleMyResults(chatId);
                break;
            case BotConstants.BTN_CHANGE_NAME:
                state.setState(BotState.AWAITING_NAME);
                stateRepository.save(state);
                telegramBotService.sendMessageTo(chatId, BotConstants.MSG_ASK_NAME);
                break;
            case BotConstants.BTN_MY_COINS:
                telegramBotService.sendMessageTo(chatId, "Coinlaringiz: Tez orada ishga tushadi");
                break;
            case BotConstants.BTN_PAID_TESTS:
                handlePaidTestsMenu(chatId);
                break;
            case BotConstants.BTN_TEST_ANALYSIS:
                handleTestAnalysisMenu(chatId);
                break;
            case BotConstants.BTN_REFERRAL:
                handleReferralMenu(chatId);
                break;
            case BotConstants.BTN_LEAVE_REVIEW:
                state.setState(BotState.AWAITING_REVIEW);
                stateRepository.save(state);
                telegramBotService.sendMessageTo(chatId, "Iltimos, o'z izohingizni yoki takliflaringizni yozib yuboring:");
                break;
            case BotConstants.BTN_ABOUT:
                telegramBotService.sendMessageTo(chatId, BotConstants.MSG_COMING_SOON);
                break;
            default:
                sendMainMenu(chatId, state);
                break;
        }
    }

    private void handleCategoryInput(String chatId, String text, BotUserState state) {
        if ("🔙 Orqaga".equals(text)) {
            sendMainMenu(chatId, state);
            return;
        }

        com.lmscrm.backend.domain.enums.ExamType type = null;
        if (BotConstants.BTN_CAT_SAT.equals(text)) {
            type = com.lmscrm.backend.domain.enums.ExamType.SAT;
        } else if (BotConstants.BTN_CAT_MILLIY.equals(text)) {
            type = com.lmscrm.backend.domain.enums.ExamType.NATIONAL_CERT;
        } else if (BotConstants.BTN_CAT_AI.equals(text) || BotConstants.BTN_CAT_IELTS.equals(text)) {
            telegramBotService.sendMessageTo(chatId, BotConstants.MSG_COMING_SOON);
            return;
        } else {
            sendMainMenu(chatId, state);
            return;
        }

        java.util.List<com.lmscrm.backend.domain.entity.Exam> exams = examRepository.findByTypeOrderByCreatedAtDesc(type);
        if (exams.isEmpty()) {
            telegramBotService.sendMessageTo(chatId, "Hozircha ushbu bo'limda testlar yo'q.");
            return;
        }

        StringBuilder sb = new StringBuilder("<b>" + text + "</b> bo'yicha testlar:\n\n");
        java.util.List<java.util.List<Map<String, String>>> inlineKeyboard = new java.util.ArrayList<>();

        for (com.lmscrm.backend.domain.entity.Exam exam : exams) {
            String emoji = BotConstants.EMOJI_FREE;
            if ("pro".equalsIgnoreCase(exam.getRequiredPack())) emoji = BotConstants.EMOJI_PRO;
            else if ("elite".equalsIgnoreCase(exam.getRequiredPack())) emoji = BotConstants.EMOJI_ELITE;

            String btnText = emoji + " " + exam.getTitle();
            Map<String, String> btn = new HashMap<>();
            btn.put("text", btnText);
            btn.put("callback_data", "exam_" + exam.getId());
            inlineKeyboard.add(java.util.List.of(btn));
        }

        sendMessageWithMarkup(chatId, sb.toString(), KeyboardFactory.createInlineKeyboard(inlineKeyboard));
    }

    private void handleMyResults(String chatId) {
        Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
        if (userOpt.isEmpty()) return;

        java.util.List<com.lmscrm.backend.domain.entity.StudentAttempt> attempts = attemptRepository.findByStudentIdOrderByStartedAtDesc(userOpt.get().getId());
        if (attempts.isEmpty()) {
            telegramBotService.sendMessageTo(chatId, "Siz hali hech qanday test ishlaganingiz yo'q.");
            return;
        }

        StringBuilder sb = new StringBuilder("📊 <b>Sizning natijalaringiz:</b>\n\n");
        int count = 0;
        for (com.lmscrm.backend.domain.entity.StudentAttempt attempt : attempts) {
            if (count >= 5) break; // show last 5
            
            long correct = 0;
            long incorrect = 0;
            try {
                java.util.List<com.lmscrm.backend.domain.entity.StudentAnswer> answers = answerRepository.findByAttemptId(attempt.getId());
                correct = answers.stream().filter(a -> a.getIsCorrect() != null && a.getIsCorrect()).count();
                incorrect = answers.size() - correct;
            } catch (Exception e) {}

            int percentage = attempt.getMaxScore() != null && attempt.getMaxScore() > 0 ? 
                    (int) Math.round((double) (attempt.getTotalScore() != null ? attempt.getTotalScore() : 0) / attempt.getMaxScore() * 100) : 0;

            sb.append("📚 <b>Test nomi:</b> ").append(attempt.getExam().getTitle()).append("\n")
              .append("✅ <b>To'g'ri javoblar:</b> ").append(correct).append("\n")
              .append("❌ <b>Noto'g'ri javoblar:</b> ").append(incorrect).append("\n")
              .append("📊 <b>Foiz:</b> ").append(percentage).append("%\n")
              .append("🏆 <b>Natija:</b> ").append(attempt.getOverallBand() != null ? attempt.getOverallBand() : (attempt.getTotalScore() != null ? attempt.getTotalScore() : 0)).append("\n")
              .append("📅 <b>Sana:</b> ").append(attempt.getFinishedAt() != null ? attempt.getFinishedAt().toLocalDate() : attempt.getStartedAt().toLocalDate()).append("\n\n");
            count++;
        }
        telegramBotService.sendMessageTo(chatId, sb.toString());
    }

    private void handleTestAnalysisMenu(String chatId) {
        Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
        if (userOpt.isEmpty()) return;

        java.util.List<com.lmscrm.backend.domain.entity.StudentAttempt> attempts = attemptRepository.findByStudentIdOrderByStartedAtDesc(userOpt.get().getId());
        if (attempts.isEmpty()) {
            telegramBotService.sendMessageTo(chatId, "Tahlil qilish uchun testlar topilmadi.");
            return;
        }

        StringBuilder sb = new StringBuilder("📈 <b>Test tahlili</b>\n\nQaysi testning tahlilini ko'rmoqchisiz?");
        java.util.List<java.util.List<Map<String, String>>> inlineKeyboard = new java.util.ArrayList<>();

        int count = 0;
        for (com.lmscrm.backend.domain.entity.StudentAttempt attempt : attempts) {
            if (count >= 5) break;
            Map<String, String> btn = new HashMap<>();
            String date = attempt.getStartedAt().toLocalDate().toString();
            btn.put("text", attempt.getExam().getTitle() + " (" + date + ")");
            
            // Due to callback_data length limit (64 chars), we will just deep link or send brief analysis
            // We'll generate a deep link to the website for full analysis since full questions won't fit in TG well.
            btn.put("callback_data", "analysis_" + attempt.getId());
            inlineKeyboard.add(java.util.List.of(btn));
            count++;
        }

        sendMessageWithMarkup(chatId, sb.toString(), KeyboardFactory.createInlineKeyboard(inlineKeyboard));
    }

    private void handlePaidTestsMenu(String chatId) {
        java.util.List<com.lmscrm.backend.domain.entity.SubscriptionPack> packs = packRepository.findAll();
        if (packs.isEmpty()) {
            telegramBotService.sendMessageTo(chatId, "Hozircha pullik paketlar mavjud emas.");
            return;
        }

        StringBuilder sb = new StringBuilder("💰 <b>Pullik paketlar</b>\n\nQuyidagi paketlardan birini tanlang:\n");
        java.util.List<java.util.List<Map<String, String>>> inlineKeyboard = new java.util.ArrayList<>();

        for (com.lmscrm.backend.domain.entity.SubscriptionPack pack : packs) {
            if ("FREE".equalsIgnoreCase(pack.getType().name())) continue;

            String emoji = "PRO".equalsIgnoreCase(pack.getType().name()) ? BotConstants.EMOJI_PRO : BotConstants.EMOJI_ELITE;
            sb.append("\n").append(emoji).append(" <b>").append(pack.getName()).append("</b> - ").append(pack.getPrice()).append(" UZS");

            Map<String, String> btn = new HashMap<>();
            btn.put("text", "Sotib olish: " + pack.getName());
            btn.put("callback_data", "buy_pack_" + pack.getId());
            inlineKeyboard.add(java.util.List.of(btn));
        }

        sendMessageWithMarkup(chatId, sb.toString(), KeyboardFactory.createInlineKeyboard(inlineKeyboard));
    }

    private void handlePhoto(String chatId, java.util.List<Map<String, Object>> photos, BotUserState state) {
        if (state.getState() != BotState.AWAITING_PAYMENT_RECEIPT || state.getSelectedPackId() == null) {
            telegramBotService.sendMessageTo(chatId, "Rasm qabul qilindi, lekin hozirda to'lov kutilmayapti.");
            return;
        }

        // Get the largest photo (last in array)
        Map<String, Object> photo = photos.get(photos.size() - 1);
        String fileId = (String) photo.get("file_id");

        Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
        if (userOpt.isEmpty()) return;
        User user = userOpt.get();

        java.util.UUID packId = java.util.UUID.fromString(state.getSelectedPackId());
        Optional<com.lmscrm.backend.domain.entity.SubscriptionPack> packOpt = packRepository.findById(packId);
        if (packOpt.isEmpty()) {
            telegramBotService.sendMessageTo(chatId, "Paket topilmadi.");
            return;
        }

        // Save request
        com.lmscrm.backend.domain.entity.SubscriptionRequest req = new com.lmscrm.backend.domain.entity.SubscriptionRequest();
        req.setUser(user);
        req.setPack(packOpt.get());
        req.setStatus("PENDING");
        req.setRequestedAt(java.time.LocalDateTime.now());
        req.setReceiptUrl(fileId);
        req = subscriptionRequestRepository.save(req);

        // Reset state
        state.setState(BotState.MAIN_MENU);
        state.setSelectedPackId(null);
        stateRepository.save(state);

        telegramBotService.sendMessageTo(chatId, "⏳ Chek qabul qilindi va admin tekshiruviga yuborildi. Tasdiqlangach sizga xabar beramiz.");

        // Send to admin
        String caption = String.format("🧾 <b>Yangi to'lov!</b>\n\n👤 Foydalanuvchi: %s\n📱 Telefon: %s\n📦 Paket: %s\n\nIltimos, chekni tekshiring va tasdiqlang.",
                user.getFullName(), user.getPhoneNumber() != null ? user.getPhoneNumber() : "Kiritilmagan", packOpt.get().getName());

        String approveCallback = "approve_sub:" + req.getId();
        String rejectCallback = "reject_sub:" + req.getId();

        // Forward fileId as photo URL. Telegram API can send photo by file_id.
        telegramBotService.sendPhotoWithInlineButtons(adminChatId, caption, fileId, approveCallback, rejectCallback);
    }

    private void handleReferralMenu(String chatId) {
        Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
        if (userOpt.isEmpty()) return;
        User user = userOpt.get();

        String refCode = user.getReferralCode();
        // Fallback if not generated yet
        if (refCode == null || refCode.isBlank()) {
            telegramBotService.sendMessageTo(chatId, "Referal kod topilmadi. Profilni yangilang.");
            return;
        }

        String botUsername = "LMSHubBot"; // We can hardcode or get from Telegram API
        String refLink = "https://t.me/" + botUsername + "?start=" + refCode;

        long invitedCount = userRepository.findAll().stream().filter(u -> user.getId().equals(u.getReferredBy())).count();

        String text = String.format("🎁 <b>Taklif qilish tizimi</b>\n\nDo'stlaringizni taklif qiling va har bir ro'yxatdan o'tgan do'stingiz uchun <b>10 Coin</b> oling!\n\n🔗 <b>Sizning referal havolangiz:</b>\n%s\n\n👥 Taklif qilingan do'stlar soni: %d", refLink, invitedCount);
        telegramBotService.sendMessageTo(chatId, text);
    }

    private void handleReviewInput(String chatId, String text, BotUserState state) {
        if ("🔙 Orqaga".equals(text)) {
            sendMainMenu(chatId, state);
            return;
        }

        Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
        if (userOpt.isEmpty()) return;
        User user = userOpt.get();

        com.lmscrm.backend.domain.entity.BotReview review = new com.lmscrm.backend.domain.entity.BotReview();
        review.setUser(user);
        review.setText(text);
        botReviewRepository.save(review);

        state.setState(BotState.MAIN_MENU);
        stateRepository.save(state);

        telegramBotService.sendMessageTo(chatId, "✅ Izohingiz uchun rahmat! Fikringiz biz uchun juda muhim.");
        telegramBotService.sendMessageTo(adminChatId, "💬 <b>Yangi izoh!</b>\n\n👤 " + user.getFullName() + ":\n" + text);
    }

    private void handleAdminPanel(String chatId) {
        // Simple admin panel logic
        if (!chatId.equals(adminChatId)) {
            telegramBotService.sendMessageTo(chatId, "Sizda ushbu bo'limga kirish huquqi yo'q.");
            return;
        }
        
        // Generate Deep Link to the admin panel
        Optional<User> userOpt = userRepository.findByTelegramChatId(chatId);
        if (userOpt.isEmpty()) return;
        String token = jwtTokenProvider.generateTokenForUser(userOpt.get());
        String link = telegramBotService.getSiteUrl() + "/auth/bot-login?token=" + token + "&redirect=/admin/dashboard";

        java.util.List<java.util.List<Map<String, String>>> kb = new java.util.ArrayList<>();
        Map<String, String> linkBtn = new HashMap<>();
        linkBtn.put("text", "🌐 Saytga o'tish (Admin)");
        linkBtn.put("url", link);
        kb.add(java.util.List.of(linkBtn));

        telegramBotService.sendMessageWithInlineButtons(chatId, "👨‍💻 <b>Admin Panel</b>\nTo'liq boshqaruv uchun saytga o'ting:", "", "");
        sendMessageWithMarkup(chatId, "Saytga o'tish tugmasini bosing:", KeyboardFactory.createInlineKeyboard(kb));
    }

    private void sendMainMenu(String chatId, BotUserState state) {
        state.setState(BotState.MAIN_MENU);
        stateRepository.save(state);
        sendMessageWithMarkup(chatId, BotConstants.MSG_MAIN_MENU, KeyboardFactory.createMainMenu());
    }

    private void sendSubscriptionRequired(String chatId) {
        sendMessageWithMarkup(chatId, BotConstants.MSG_NOT_SUBSCRIBED, KeyboardFactory.createChannelCheckInline());
    }

    private BotUserState getOrCreateState(String chatId) {
        return stateRepository.findByTelegramChatId(chatId)
                .orElseGet(() -> {
                    BotUserState s = new BotUserState();
                    s.setTelegramChatId(chatId);
                    s.setState(BotState.START);
                    return stateRepository.save(s);
                });
    }

    private boolean isSubscribed(String chatId) {
        try {
            String url = String.format("https://api.telegram.org/bot%s/getChatMember?chat_id=%s&user_id=%s",
                    botToken, "@LMSHub", chatId);
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && (Boolean) response.get("ok")) {
                Map<String, Object> result = (Map<String, Object>) response.get("result");
                String status = (String) result.get("status");
                return "member".equals(status) || "administrator".equals(status) || "creator".equals(status);
            }
        } catch (Exception e) {
            log.error("Failed to check subscription for user {}: {}", chatId, e.getMessage());
            // Fail open or fail closed? Usually fail closed. But if channel doesn't exist, we'll fail.
            // Let's assume fail closed.
        }
        return false;
    }

    private void sendMessageWithMarkup(String chatId, String text, Map<String, Object> replyMarkup) {
        try {
            String apiUrl = String.format("https://api.telegram.org/bot%s/sendMessage", botToken);

            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", text);
            body.put("parse_mode", "HTML");
            body.put("reply_markup", replyMarkup);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(apiUrl, entity, String.class);
        } catch (Exception e) {
            log.error("Failed to send message with markup: ", e);
        }
    }
}
