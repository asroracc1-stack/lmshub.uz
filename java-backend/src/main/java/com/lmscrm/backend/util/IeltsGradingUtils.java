package com.lmscrm.backend.util;

import java.util.Map;
import java.util.TreeMap;

public class IeltsGradingUtils {

    private static final TreeMap<Integer, Double> READING_BAND = new TreeMap<>();
    private static final TreeMap<Integer, Double> LISTENING_BAND = new TreeMap<>();

    static {
        // Academic Reading
        READING_BAND.put(39, 9.0); READING_BAND.put(40, 9.0);
        READING_BAND.put(37, 8.5); READING_BAND.put(38, 8.5);
        READING_BAND.put(35, 8.0); READING_BAND.put(36, 8.0);
        READING_BAND.put(33, 7.5); READING_BAND.put(34, 7.5);
        READING_BAND.put(30, 7.0); READING_BAND.put(31, 7.0); READING_BAND.put(32, 7.0);
        READING_BAND.put(27, 6.5); READING_BAND.put(28, 6.5); READING_BAND.put(29, 6.5);
        READING_BAND.put(23, 6.0); READING_BAND.put(24, 6.0); READING_BAND.put(25, 6.0); READING_BAND.put(26, 6.0);
        READING_BAND.put(19, 5.5); READING_BAND.put(20, 5.5); READING_BAND.put(21, 5.5); READING_BAND.put(22, 5.5);
        READING_BAND.put(15, 5.0); READING_BAND.put(16, 5.0); READING_BAND.put(17, 5.0); READING_BAND.put(18, 5.0);
        READING_BAND.put(13, 4.5); READING_BAND.put(14, 4.5);
        READING_BAND.put(10, 4.0); READING_BAND.put(11, 4.0); READING_BAND.put(12, 4.0);
        READING_BAND.put(8, 3.5); READING_BAND.put(9, 3.5);
        READING_BAND.put(6, 3.0); READING_BAND.put(7, 3.0);
        READING_BAND.put(4, 2.5); READING_BAND.put(5, 2.5);

        // Listening
        LISTENING_BAND.put(39, 9.0); LISTENING_BAND.put(40, 9.0);
        LISTENING_BAND.put(37, 8.5); LISTENING_BAND.put(38, 8.5);
        LISTENING_BAND.put(35, 8.0); LISTENING_BAND.put(36, 8.0);
        LISTENING_BAND.put(32, 7.5); LISTENING_BAND.put(33, 7.5); LISTENING_BAND.put(34, 7.5);
        LISTENING_BAND.put(30, 7.0); LISTENING_BAND.put(31, 7.0);
        LISTENING_BAND.put(26, 6.5); LISTENING_BAND.put(27, 6.5); LISTENING_BAND.put(28, 6.5); LISTENING_BAND.put(29, 6.5);
        LISTENING_BAND.put(23, 6.0); LISTENING_BAND.put(24, 6.0); LISTENING_BAND.put(25, 6.0);
        LISTENING_BAND.put(18, 5.5); LISTENING_BAND.put(19, 5.5); LISTENING_BAND.put(20, 5.5); LISTENING_BAND.put(21, 5.5); LISTENING_BAND.put(22, 5.5);
        LISTENING_BAND.put(16, 5.0); LISTENING_BAND.put(17, 5.0);
        LISTENING_BAND.put(13, 4.5); LISTENING_BAND.put(14, 4.5); LISTENING_BAND.put(15, 4.5);
        LISTENING_BAND.put(10, 4.0); LISTENING_BAND.put(11, 4.0); LISTENING_BAND.put(12, 4.0);
        LISTENING_BAND.put(8, 3.5); LISTENING_BAND.put(9, 3.5);
        LISTENING_BAND.put(6, 3.0); LISTENING_BAND.put(7, 3.0);
        LISTENING_BAND.put(4, 2.5); LISTENING_BAND.put(5, 2.5);
    }

    public static double rawToBand(String kind, int raw, int total) {
        int scaled = (int) Math.round((double) raw / Math.max(total, 1) * 40.0);
        TreeMap<Integer, Double> table = "listening".equalsIgnoreCase(kind) ? LISTENING_BAND : READING_BAND;
        
        if (scaled >= 40) return 9.0;
        if (scaled <= 3) return 2.0;

        Map.Entry<Integer, Double> entry = table.floorEntry(scaled);
        return entry != null ? entry.getValue() : 0.0;
    }

    public static String normalizeAnswer(String s) {
        if (s == null) return "";
        return s.trim().toLowerCase().replaceAll("\\s+", " ").replaceAll("[.,!?;:'\"`]", "");
    }

    public static boolean checkAnswer(String user, String correct) {
        if (correct == null || correct.isBlank()) return false;
        String u = normalizeAnswer(user);
        String[] variants = correct.split("[/|]");
        for (String variant : variants) {
            String v = normalizeAnswer(variant);
            if (!v.isEmpty()) {
                if (u.equals(v) || u.equals(v.replaceFirst("^(the|a|an) ", ""))) {
                    return true;
                }
            }
        }
        return false;
    }
}
