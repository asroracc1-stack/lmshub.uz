package com.lmscrm.backend.dto.exam.parser;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ParseResult {

    private List<ParsedQuestion> questions = new ArrayList<>();
    private List<MediaAsset> mediaAssets = new ArrayList<>();

    @Data
    public static class ParsedQuestion {
        private String originalId;
        private String questionType;
        private String rawText;
        private String correctAnswer; // used for Exact Match questions like FillBlank
        private String explanation;
        private List<ParsedOption> options = new ArrayList<>();
        private List<String> mediaRefs = new ArrayList<>();
    }

    @Data
    public static class ParsedOption {
        private String label;
        private String text;
        private boolean isCorrect;
    }

    @Data
    public static class MediaAsset {
        private String refId;
        private String rawSvg; // SVG string or base64
        private byte[] binaryData;
        private String uploadedUrl;
    }
}
