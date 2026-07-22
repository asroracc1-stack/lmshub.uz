package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

/**
 * LmsHubHtmlParser — The ONE parser for LMSHub HTML v1 Specification.
 *
 * Supported format: lmshub-v1
 *
 * STRICT RULES:
 *   ✅ Reads: data-*, lmshub-* custom elements, <lmshub-exam>, <lmshub-section>,
 *             <lmshub-passage>, <lmshub-question>, <lmshub-option>,
 *             <lmshub-answer>, <lmshub-text>, <lmshub-explanation>, <lmshub-media>
 *   ❌ NEVER reads: style, class, font, color, margin, padding, button,
 *                   theme, animation, script, canvas, nav, sidebar, div (non-lmshub)
 */
@Component
public class LmsHubHtmlParser implements ExamParser {

    public static final String SUPPORTED_VERSION = "lmshub-v1";
    public static final String PARSER_VERSION    = "LmsHubHtmlParser-1.0";

    @Override
    public boolean supports(String formatVersion) {
        return SUPPORTED_VERSION.equalsIgnoreCase(formatVersion);
    }

    @Override
    public ParseResult parse(byte[] fileBytes, String fileName) throws Exception {
        ParseResult result = new ParseResult();
        String html = new String(fileBytes, StandardCharsets.UTF_8);
        Document doc = Jsoup.parse(html);

        // ── 1. Extract exam-level metadata from <html> attributes ────────────
        Element htmlEl = doc.selectFirst("html");
        if (htmlEl != null) {
            result.setHtmlVersion(htmlEl.attr("data-format"));
            result.setExamType(htmlEl.attr("data-exam"));
            result.setExamTitle(htmlEl.attr("data-title"));
            result.setSubject(htmlEl.attr("data-subject"));
            String dur = htmlEl.attr("data-duration");
            if (!dur.isBlank()) {
                try { result.setDurationMinutes(Integer.parseInt(dur)); } catch (NumberFormatException ignored) {}
            }
        }

        // Fallback: read <meta name="lmshub:*"> tags if html attributes missing
        if (isBlank(result.getExamType())) {
            result.setExamType(metaContent(doc, "lmshub:exam"));
        }
        if (isBlank(result.getHtmlVersion())) {
            result.setHtmlVersion(metaContent(doc, "lmshub:format"));
        }
        if (isBlank(result.getExamTitle())) {
            result.setExamTitle(metaContent(doc, "lmshub:title"));
        }

        // ── 2. Parse sections ─────────────────────────────────────────────────
        Elements sectionEls = doc.select("lmshub-section");
        int sectionOrder = 1;

        for (Element sectionEl : sectionEls) {
            ParseResult.ParsedSection section = new ParseResult.ParsedSection();
            section.setSectionId(attrOrRandom(sectionEl, "data-id"));
            section.setSectionTitle(sectionEl.attr("data-title"));
            section.setOrder(attrInt(sectionEl, "data-order", sectionOrder));
            section.setTimeLimitSeconds(attrIntNullable(sectionEl, "data-time-limit"));

            // Audio reference
            String audioRef = sectionEl.attr("data-audio");
            if (!audioRef.isBlank()) {
                section.setPassageAudioRef(audioRef);
            }

            // Passage text
            Element passageEl = sectionEl.selectFirst("lmshub-passage");
            if (passageEl != null) {
                // Extract any embedded media from passage before getting text
                extractMediaFromElement(passageEl, result);
                section.setPassageText(passageEl.text().trim());
                // Check for image ref
                Element mediaEl = passageEl.selectFirst("lmshub-media");
                if (mediaEl != null) {
                    section.setPassageImageRef(mediaEl.attr("data-ref"));
                }
            }

            // Instructions
            Element instrEl = sectionEl.selectFirst("lmshub-instructions");
            if (instrEl != null) {
                section.setInstructions(instrEl.text().trim());
            }

            // Questions
            Elements questionEls = sectionEl.select("lmshub-question");
            int qOrder = 1;
            for (Element qEl : questionEls) {
                ParseResult.ParsedQuestion pq = parseQuestion(qEl, result, qOrder);
                section.getQuestions().add(pq);
                qOrder++;
            }

            result.getSections().add(section);
            sectionOrder++;
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private ParseResult.ParsedQuestion parseQuestion(Element qEl,
                                                      ParseResult result,
                                                      int defaultOrder) {
        ParseResult.ParsedQuestion pq = new ParseResult.ParsedQuestion();
        pq.setOriginalId(attrOrRandom(qEl, "data-id"));
        pq.setQuestionType(qEl.attr("data-type").toUpperCase());
        pq.setOrder(attrInt(qEl, "data-order", defaultOrder));
        pq.setPoints(attrInt(qEl, "data-points", 1));

        // ── Question text ──────────────────────────────────────────────────
        Element textEl = qEl.selectFirst("lmshub-text");
        if (textEl != null) {
            extractMediaFromElement(textEl, result, pq);
            pq.setRawText(textEl.text().trim());
        }

        // ── Options ────────────────────────────────────────────────────────
        Elements optionEls = qEl.select("lmshub-option");
        for (Element optEl : optionEls) {
            ParseResult.ParsedOption opt = new ParseResult.ParsedOption();
            opt.setLabel(optEl.attr("data-label"));
            opt.setCorrect("true".equalsIgnoreCase(optEl.attr("data-correct")));

            // Option may contain lmshub-media
            Element optMedia = optEl.selectFirst("lmshub-media");
            if (optMedia != null) {
                opt.setMediaRef(optMedia.attr("data-ref"));
            }
            opt.setText(optEl.text().trim());
            pq.getOptions().add(opt);
        }

        // ── Answer ─────────────────────────────────────────────────────────
        Element answerEl = qEl.selectFirst("lmshub-answer");
        if (answerEl != null) {
            pq.setCorrectAnswer(answerEl.text().trim());
            // Multiple fill blanks: <lmshub-answer data-blank="1">London</lmshub-answer>
            Elements multiAnswers = qEl.select("lmshub-answer[data-blank]");
            for (Element ma : multiAnswers) {
                pq.getFillAnswers().add(ma.text().trim());
            }
        }

        // ── Explanation ────────────────────────────────────────────────────
        Element expEl = qEl.selectFirst("lmshub-explanation");
        if (expEl != null) {
            pq.setExplanation(expEl.text().trim());
        }

        // ── Matching pairs ─────────────────────────────────────────────────
        Elements matchEls = qEl.select("lmshub-match");
        for (Element m : matchEls) {
            String key = m.attr("data-left");
            String val = m.attr("data-right");
            if (!key.isBlank() && !val.isBlank()) {
                pq.getMatchingPairs().put(key, val);
            }
        }

        return pq;
    }

    /**
     * Extract <lmshub-media> elements from a container,
     * decoding base64 or registering external refs.
     */
    private void extractMediaFromElement(Element container, ParseResult result) {
        extractMediaFromElement(container, result, null);
    }

    private void extractMediaFromElement(Element container, ParseResult result,
                                          ParseResult.ParsedQuestion pq) {
        for (Element mediaEl : container.select("lmshub-media")) {
            String ref = mediaEl.attr("data-ref");
            if (ref.isBlank()) {
                ref = "media_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                mediaEl.attr("data-ref", ref);
            }

            // Check if not already registered
            final String finalRef = ref;
            boolean alreadyAdded = result.getMediaAssets().stream()
                    .anyMatch(a -> finalRef.equals(a.getRefId()));
            if (!alreadyAdded) {
                ParseResult.MediaAsset asset = new ParseResult.MediaAsset();
                asset.setRefId(finalRef);
                asset.setOriginalName(mediaEl.attr("data-name"));

                // src may be base64 encoded data URI
                String src = mediaEl.attr("data-src");
                if (src.startsWith("data:")) {
                    String[] parts = src.split(",", 2);
                    String meta = parts[0]; // e.g. "data:image/png;base64"
                    asset.setMimeType(meta.replace("data:", "").replace(";base64", ""));
                    if (parts.length > 1) {
                        asset.setBinaryData(Base64.getDecoder().decode(parts[1]));
                    }
                }
                result.getMediaAssets().add(asset);
            }

            if (pq != null && !pq.getMediaRefs().contains(finalRef)) {
                pq.getMediaRefs().add(finalRef);
            }
        }
    }

    private String metaContent(Document doc, String name) {
        Element meta = doc.selectFirst("meta[name=" + name + "]");
        return meta != null ? meta.attr("content") : "";
    }

    private String attrOrRandom(Element el, String attrName) {
        String val = el.attr(attrName);
        return val.isBlank() ? UUID.randomUUID().toString() : val;
    }

    private int attrInt(Element el, String attrName, int defaultVal) {
        try { return Integer.parseInt(el.attr(attrName)); }
        catch (NumberFormatException e) { return defaultVal; }
    }

    private Integer attrIntNullable(Element el, String attrName) {
        String val = el.attr(attrName);
        if (val.isBlank()) return null;
        try { return Integer.parseInt(val); } catch (NumberFormatException e) { return null; }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
