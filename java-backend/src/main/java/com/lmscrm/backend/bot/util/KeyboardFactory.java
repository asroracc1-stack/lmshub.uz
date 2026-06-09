package com.lmscrm.backend.bot.util;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class KeyboardFactory {

    public static Map<String, Object> createMainMenu() {
        Map<String, Object> replyMarkup = new HashMap<>();
        List<List<Map<String, Object>>> keyboard = new ArrayList<>();

        keyboard.add(List.of(createReplyButton(BotConstants.BTN_START_TEST), createReplyButton(BotConstants.BTN_MY_RESULTS)));
        keyboard.add(List.of(createReplyButton(BotConstants.BTN_TEST_ANALYSIS), createReplyButton(BotConstants.BTN_PAID_TESTS)));
        keyboard.add(List.of(createReplyButton(BotConstants.BTN_MY_COINS), createReplyButton(BotConstants.BTN_REFERRAL)));
        keyboard.add(List.of(createReplyButton(BotConstants.BTN_ABOUT), createReplyButton(BotConstants.BTN_CHANGE_NAME)));
        keyboard.add(List.of(createReplyButton(BotConstants.BTN_LEAVE_REVIEW)));

        replyMarkup.put("keyboard", keyboard);
        replyMarkup.put("resize_keyboard", true);
        return replyMarkup;
    }

    public static Map<String, Object> createPhoneRequestMenu() {
        Map<String, Object> replyMarkup = new HashMap<>();
        List<List<Map<String, Object>>> keyboard = new ArrayList<>();
        
        Map<String, Object> phoneBtn = new HashMap<>();
        phoneBtn.put("text", "📱 Telefon raqamni yuborish");
        phoneBtn.put("request_contact", true);
        
        keyboard.add(List.of(phoneBtn));

        replyMarkup.put("keyboard", keyboard);
        replyMarkup.put("resize_keyboard", true);
        replyMarkup.put("one_time_keyboard", true);
        return replyMarkup;
    }

    public static Map<String, Object> createCategoriesMenu() {
        Map<String, Object> replyMarkup = new HashMap<>();
        List<List<Map<String, Object>>> keyboard = new ArrayList<>();

        keyboard.add(List.of(createReplyButton(BotConstants.BTN_CAT_SAT), createReplyButton(BotConstants.BTN_CAT_MILLIY)));
        keyboard.add(List.of(createReplyButton(BotConstants.BTN_CAT_AI), createReplyButton(BotConstants.BTN_CAT_IELTS)));
        keyboard.add(List.of(createReplyButton("🔙 Orqaga")));

        replyMarkup.put("keyboard", keyboard);
        replyMarkup.put("resize_keyboard", true);
        return replyMarkup;
    }

    public static Map<String, Object> createChannelCheckInline() {
        Map<String, Object> replyMarkup = new HashMap<>();
        List<List<Map<String, Object>>> keyboard = new ArrayList<>();

        Map<String, Object> linkBtn = new HashMap<>();
        linkBtn.put("text", BotConstants.BTN_CHANNEL_LINK);
        linkBtn.put("url", "https://t.me/LMSHub");

        Map<String, Object> checkBtn = new HashMap<>();
        checkBtn.put("text", BotConstants.BTN_CHECK_SUB);
        checkBtn.put("callback_data", "check_sub");

        keyboard.add(List.of(linkBtn));
        keyboard.add(List.of(checkBtn));

        replyMarkup.put("inline_keyboard", keyboard);
        return replyMarkup;
    }
    
    public static Map<String, Object> createInlineKeyboard(List<List<Map<String, String>>> buttons) {
        Map<String, Object> replyMarkup = new HashMap<>();
        List<List<Map<String, Object>>> keyboard = new ArrayList<>();

        for (List<Map<String, String>> row : buttons) {
            List<Map<String, Object>> newRow = new ArrayList<>();
            for (Map<String, String> btn : row) {
                Map<String, Object> map = new HashMap<>(btn);
                newRow.add(map);
            }
            keyboard.add(newRow);
        }

        replyMarkup.put("inline_keyboard", keyboard);
        return replyMarkup;
    }

    private static Map<String, Object> createReplyButton(String text) {
        Map<String, Object> btn = new HashMap<>();
        btn.put("text", text);
        return btn;
    }
}
