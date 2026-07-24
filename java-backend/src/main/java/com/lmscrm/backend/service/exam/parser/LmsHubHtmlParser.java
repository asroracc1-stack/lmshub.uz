package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LmsHubHtmlParser — Universal parser for LMSHub HTML v1.
 *
 * Supported format: lmshub-v1
 *
 * Supports TWO modes automatically:
 *   MODE A — Custom lmshub-* elements  (<lmshub-section>, <lmshub-question>, ...)
 *   MODE B — Plain HTML                (<div class="question">, <h3>, <input>, <select>, <label>)
 *
 * The parser auto-detects which mode to use based on DOM structure.
 * No manual selection required.
 */
@Component
public class LmsHubHtmlParser implements ExamParser {

    public static final String SUPPORTED_VERSION = "lmshub-v1";
    public static final String PARSER_VERSION    = "LmsHubHtmlParser-2.0";

    // Answer key: extracted from JavaScript const answers = { q1: "YES", ... }
    private static final Pattern JS_ANSWERS_OBJ = Pattern.compile(
            "(?:const|var|let)\\s+(?:answers|correctAnswers|AK|ANSWERS)\\s*=\\s*\\{([^}]+)\\}",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE
    );
    private static final Pattern JS_KEY_VALUE = Pattern.compile(
            "(['\"]?)([a-zA-Z_][a-zA-Z0-9_]*)\\1\\s*:\\s*['\"]([^'\"]+)['\"]"
    );

    // Instruction heading patterns  e.g. "Questions 1-5 (TRUE/FALSE/NOT GIVEN)"
    private static final Pattern GROUP_HEADING = Pattern.compile(
            "(?i)questions?\\s+([\\d]+)[\\s\\-–]+([\\d]+)\\s*[:(\\[]?\\s*([^)\\]\\n]{3,60})",
            Pattern.CASE_INSENSITIVE
    );

    @Override
    public boolean supports(String formatVersion) {
        return SUPPORTED_VERSION.equalsIgnoreCase(formatVersion);
    }

    @Override
    public ParseResult parse(byte[] fileBytes, String fileName) throws Exception {
        ParseResult result = new ParseResult();
        String html = new String(fileBytes, StandardCharsets.UTF_8);
        Document doc = Jsoup.parse(html);

        // ── 1. Exam-level metadata ─────────────────────────────────────────────
        extractMetadata(doc, result);

        // ── 2. Choose parse mode ───────────────────────────────────────────────
        boolean hasLmshubSections = !doc.select("lmshub-section").isEmpty();

        if (hasLmshubSections) {
            parseLmshubMode(doc, result);
        } else {
            parsePlainHtmlMode(doc, result, html);
        }

        return result;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE A — lmshub-* custom elements
    // ═════════════════════════════════════════════════════════════════════════

    private void parseLmshubMode(Document doc, ParseResult result) {
        Elements sectionEls = doc.select("lmshub-section");
        int sectionOrder = 1;

        for (Element sectionEl : sectionEls) {
            ParseResult.ParsedSection section = new ParseResult.ParsedSection();
            section.setSectionId(attrOrRandom(sectionEl, "data-id"));
            section.setSectionTitle(sectionEl.attr("data-title"));
            section.setOrder(attrInt(sectionEl, "data-order", sectionOrder));
            section.setTimeLimitSeconds(attrIntNullable(sectionEl, "data-time-limit"));

            String audioRef = sectionEl.attr("data-audio");
            if (!audioRef.isBlank()) section.setPassageAudioRef(audioRef);

            Element passageEl = sectionEl.selectFirst("lmshub-passage");
            if (passageEl != null) {
                extractMediaFromElement(passageEl, result);
                section.setPassageText(passageEl.html().trim());
                Element mediaEl = passageEl.selectFirst("lmshub-media");
                if (mediaEl != null) section.setPassageImageRef(mediaEl.attr("data-ref"));
            }

            Element instrEl = sectionEl.selectFirst("lmshub-instructions");
            if (instrEl != null) section.setInstructions(instrEl.text().trim());

            Elements questionEls = sectionEl.select("lmshub-question");
            int qOrder = 1;
            for (Element qEl : questionEls) {
                section.getQuestions().add(parseLmshubQuestion(qEl, result, qOrder++));
            }

            result.getSections().add(section);
            sectionOrder++;
        }
    }

    private ParseResult.ParsedQuestion parseLmshubQuestion(Element qEl, ParseResult result, int defaultOrder) {
        ParseResult.ParsedQuestion pq = new ParseResult.ParsedQuestion();
        pq.setOriginalId(attrOrRandom(qEl, "data-id"));
        pq.setQuestionType(qEl.attr("data-type").toUpperCase());
        pq.setOrder(attrInt(qEl, "data-order", defaultOrder));
        pq.setPoints(attrInt(qEl, "data-points", 1));

        Element textEl = qEl.selectFirst("lmshub-text");
        if (textEl != null) {
            extractMediaFromElement(textEl, result, pq);
            pq.setRawText(textEl.text().trim());
        }

        Elements optionEls = qEl.select("lmshub-option");
        for (Element optEl : optionEls) {
            ParseResult.ParsedOption opt = new ParseResult.ParsedOption();
            opt.setLabel(optEl.attr("data-label"));
            opt.setCorrect("true".equalsIgnoreCase(optEl.attr("data-correct")));
            Element optMedia = optEl.selectFirst("lmshub-media");
            if (optMedia != null) opt.setMediaRef(optMedia.attr("data-ref"));
            opt.setText(optEl.text().trim());
            pq.getOptions().add(opt);
        }

        Element answerEl = qEl.selectFirst("lmshub-answer");
        if (answerEl != null) {
            pq.setCorrectAnswer(answerEl.text().trim());
            for (Element ma : qEl.select("lmshub-answer[data-blank]")) {
                pq.getFillAnswers().add(ma.text().trim());
            }
        }

        Element expEl = qEl.selectFirst("lmshub-explanation");
        if (expEl != null) pq.setExplanation(expEl.text().trim());

        for (Element m : qEl.select("lmshub-match")) {
            String key = m.attr("data-left");
            String val = m.attr("data-right");
            if (!key.isBlank() && !val.isBlank()) pq.getMatchingPairs().put(key, val);
        }

        return pq;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MODE B — Plain HTML (div.question / label / input / select / h3)
    // ═════════════════════════════════════════════════════════════════════════

    private void parsePlainHtmlMode(Document doc, ParseResult result, String rawHtml) {
        ParseResult.ParsedSection section = new ParseResult.ParsedSection();
        section.setSectionId(UUID.randomUUID().toString());
        section.setOrder(1);

        // ── Passage text ──────────────────────────────────────────────────────
        // Prefer .passage, #passage, then first big <div>
        Element passageEl = doc.selectFirst(".passage, #passage, [class*='passage'], [id*='passage']");
        if (passageEl == null) passageEl = doc.selectFirst(".text, #text, .reading, #reading");
        if (passageEl != null) {
            section.setPassageText(passageEl.html().trim());
            section.setSectionTitle(firstHeading(passageEl));
        } else {
            // Use full body text as passage fallback
            Element body = doc.body();
            if (body != null) section.setPassageText(body.html().trim());
        }

        // ── Extract JS answer key ─────────────────────────────────────────────
        Map<String, String> jsAnswers = extractJsAnswers(rawHtml);

        // ── Locate question container ─────────────────────────────────────────
        Element qContainer = doc.selectFirst(".questions, #questions, [class*='question']");
        if (qContainer == null) qContainer = doc.body();

        // ── Parse question groups by heading ─────────────────────────────────
        // Build ordered list of all nodes (h3/h4 headings + question divs/labels)
        parseQuestionGroups(qContainer, section, jsAnswers);

        if (!section.getQuestions().isEmpty()) {
            result.getSections().add(section);
        }
    }

    /**
     * Walk through children of question container.
     * h3/h4 headings set current group type (TFNG, YNNG, FILL, SHORT, MCQ).
     * div.question / label elements are parsed as individual questions.
     */
    private void parseQuestionGroups(Element container,
                                      ParseResult.ParsedSection section,
                                      Map<String, String> jsAnswers) {
        String currentType = "short_answer"; // default
        String currentInstructions = "";
        int qOrder = 1;

        // Collect all relevant children in DOM order
        List<Element> nodes = new ArrayList<>();
        collectQuestionNodes(container, nodes);

        for (Element node : nodes) {
            String tag = node.tagName().toLowerCase();
            String text = node.text().trim();

            // ── Heading → update current group type ───────────────────────────
            if ((tag.equals("h3") || tag.equals("h4") || tag.equals("h2") || tag.equals("p"))
                    && looksLikeGroupHeading(text)) {
                currentType = detectTypeFromHeading(text);
                currentInstructions = text;
                continue;
            }

            // ── Question node ─────────────────────────────────────────────────
            if (isQuestionNode(node)) {
                ParseResult.ParsedQuestion pq = parsePlainQuestion(node, currentType, qOrder, jsAnswers);
                if (pq != null && !pq.getRawText().isBlank()) {
                    pq.setOrder(qOrder++);
                    if ((pq.getExplanation() == null || pq.getExplanation().isBlank()) && !currentInstructions.isBlank()) {
                        pq.setExplanation(currentInstructions);
                    }
                    section.getQuestions().add(pq);
                    // Set instructions on section from first group heading found
                    if (!currentInstructions.isBlank() && isBlank(section.getInstructions())) {
                        section.setInstructions(currentInstructions);
                    }
                }
            }
        }
    }

    private void collectQuestionNodes(Element root, List<Element> result) {
        for (Element child : root.children()) {
            String tag = child.tagName().toLowerCase();
            String cls = child.className().toLowerCase();

            // Headings always collected
            if (tag.matches("h[1-6]")) {
                result.add(child);
                continue;
            }
            // Instruction <p> that look like group headings
            if (tag.equals("p") && looksLikeGroupHeading(child.text())) {
                result.add(child);
                continue;
            }
            // div.question / label wrapping a question
            if (isQuestionNode(child)) {
                result.add(child);
                continue;
            }
            // Recurse into containers (div, form, section, etc.)
            if (tag.matches("div|form|section|article|ul|ol")) {
                collectQuestionNodes(child, result);
            }
        }
    }

    private boolean isQuestionNode(Element el) {
        String tag = el.tagName().toLowerCase();
        String cls = el.className().toLowerCase();
        // div.question, div with class containing 'question'
        if (tag.equals("div") && (cls.contains("question"))) return true;
        // <label> wrapping a select (matching/tfng/ynng pattern)
        if (tag.equals("label") && (el.selectFirst("select") != null || el.selectFirst("input") != null)) return true;
        return false;
    }

    private boolean looksLikeGroupHeading(String text) {
        if (text.length() < 5 || text.length() > 200) return false;
        String lo = text.toLowerCase();
        return lo.contains("question") || lo.contains("true") || lo.contains("false")
                || lo.contains("yes") || lo.contains("not given") || lo.contains("complete")
                || lo.contains("short answer") || lo.contains("multiple choice")
                || lo.contains("matching") || lo.contains("choose") || lo.contains("fill");
    }

    /**
     * Determine question type from heading text.
     */
    private String detectTypeFromHeading(String heading) {
        String lo = heading.toLowerCase();
        if (lo.contains("true") && lo.contains("false") && lo.contains("not given")) return "TRUE_FALSE_NOT_GIVEN";
        if (lo.contains("yes") && lo.contains("no") && lo.contains("not given")) return "YES_NO_NOT_GIVEN";
        if (lo.contains("complete") || lo.contains("fill") || lo.contains("blank")) return "FILL_IN_BLANK";
        if (lo.contains("multiple choice") || lo.contains("choose the")) return "MULTIPLE_CHOICE";
        if (lo.contains("matching") || lo.contains("match")) return "MATCHING";
        if (lo.contains("short answer") || lo.contains("short")) return "SHORT_ANSWER";
        return "SHORT_ANSWER";
    }

    /**
     * Parse a single question node (div.question or label) into a ParsedQuestion.
     */
    private ParseResult.ParsedQuestion parsePlainQuestion(Element node,
                                                           String currentType,
                                                           int order,
                                                           Map<String, String> jsAnswers) {
        ParseResult.ParsedQuestion pq = new ParseResult.ParsedQuestion();
        pq.setOriginalId(UUID.randomUUID().toString());
        pq.setQuestionType(currentType);
        pq.setOrder(order);
        pq.setPoints(1);

        // ── Question text ──────────────────────────────────────────────────────
        // Strip out input/select/option elements from text extraction
        Element clone = node.clone();
        clone.select("input, select, option, button").remove();
        String rawText = clone.text().trim();
        pq.setRawText(rawText);

        // ── Detect question key (q1, q15, etc.) ───────────────────────────────
        String questionKey = detectQuestionKey(node, rawText);

        // ── Answer key lookup ─────────────────────────────────────────────────
        if (!questionKey.isBlank() && jsAnswers.containsKey(questionKey)) {
            String correctAns = jsAnswers.get(questionKey);
            pq.setCorrectAnswer(correctAns);

            // For MCQ/select: build options from <select><option>
            Element selectEl = node.selectFirst("select");
            if (selectEl != null) {
                buildOptionsFromSelect(selectEl, correctAns, pq);
            } else {
                // For TFNG/YNNG/SHORT: add standard options
                buildOptionsForType(currentType, correctAns, pq);
            }
        } else {
            // No JS answer found — try to extract answer from input placeholder or value
            Element inputEl = node.selectFirst("input[type=text]");
            Element selectEl = node.selectFirst("select");
            if (selectEl != null) {
                buildOptionsFromSelect(selectEl, "", pq);
            } else {
                buildOptionsForType(currentType, "", pq);
            }
        }

        return pq;
    }

    /**
     * Detect the JS answer key name (e.g. "q15") from a question node.
     * Strategy: look at input name / select name / text number.
     */
    private String detectQuestionKey(Element node, String text) {
        // 1. input[name=q15] or select[name=q15]
        Element inputEl = node.selectFirst("input[name], select[name]");
        if (inputEl != null) {
            String name = inputEl.attr("name").trim();
            if (!name.isBlank()) return name;
        }
        // 2. Parse leading number from text: "15. One tactic..." → "q15"
        Matcher m = Pattern.compile("^(\\d+)[\\.\\)]").matcher(text);
        if (m.find()) return "q" + m.group(1);
        return "";
    }

    /**
     * Build options from a <select> element.
     */
    private void buildOptionsFromSelect(Element selectEl, String correctAns, ParseResult.ParsedQuestion pq) {
        for (Element optEl : selectEl.select("option")) {
            String val = optEl.attr("value").trim();
            if (val.isBlank() || val.equalsIgnoreCase("select")) continue;
            ParseResult.ParsedOption opt = new ParseResult.ParsedOption();
            opt.setText(val);
            opt.setLabel(val);
            opt.setCorrect(val.equalsIgnoreCase(correctAns));
            pq.getOptions().add(opt);
        }
    }

    /**
     * Build standard options for TFNG / YNNG / SHORT types.
     */
    private void buildOptionsForType(String type, String correctAns, ParseResult.ParsedQuestion pq) {
        List<String> opts;
        String t = type.toUpperCase();
        if (t.contains("TRUE") || t.equals("TRUE_FALSE_NOT_GIVEN") || t.equals("TFNG")) {
            opts = Arrays.asList("TRUE", "FALSE", "NOT GIVEN");
        } else if (t.contains("YES") || t.equals("YES_NO_NOT_GIVEN") || t.equals("YNNG")) {
            opts = Arrays.asList("YES", "NO", "NOT GIVEN");
        } else {
            // SHORT, FILL — no predefined options; correctAnswer is the free text
            pq.setCorrectAnswer(correctAns);
            return;
        }
        for (String o : opts) {
            ParseResult.ParsedOption opt = new ParseResult.ParsedOption();
            opt.setText(o);
            opt.setLabel(o);
            opt.setCorrect(o.equalsIgnoreCase(correctAns));
            pq.getOptions().add(opt);
        }
        if (!correctAns.isBlank()) pq.setCorrectAnswer(correctAns);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // JS Answer Key Extractor
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Extract JavaScript answer map from raw HTML.
     * Supports:
     *   const answers = { q1: "YES", q2: "NO", ... }
     *   const correctAnswers = { q1: "FG", ... }
     *   var AK = { ... }
     */
    private Map<String, String> extractJsAnswers(String rawHtml) {
        Map<String, String> map = new LinkedHashMap<>();
        Matcher objMatcher = JS_ANSWERS_OBJ.matcher(rawHtml);
        while (objMatcher.find()) {
            String body = objMatcher.group(1);
            Matcher kvMatcher = JS_KEY_VALUE.matcher(body);
            while (kvMatcher.find()) {
                String key = kvMatcher.group(2).trim();
                String val = kvMatcher.group(3).trim();
                map.putIfAbsent(key, val);
            }
        }
        return map;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Metadata extraction (common to both modes)
    // ═════════════════════════════════════════════════════════════════════════

    private void extractMetadata(Document doc, ParseResult result) {
        Element htmlEl = doc.selectFirst("html");
        if (htmlEl != null) {
            result.setHtmlVersion(htmlEl.attr("data-format"));
            result.setExamType(coalesce(htmlEl.attr("data-exam"), htmlEl.attr("data-module")));
            result.setExamTitle(htmlEl.attr("data-title"));
            result.setSubject(coalesce(htmlEl.attr("data-subject"), htmlEl.attr("data-module")));

            String dur = htmlEl.attr("data-duration");
            if (!dur.isBlank()) {
                try { result.setDurationMinutes(Integer.parseInt(dur)); } catch (NumberFormatException ignored) {}
            }

            String diff = htmlEl.attr("data-difficulty");
            if (diff.isBlank()) diff = htmlEl.attr("data-level");
            result.setDifficulty(diff.isBlank() ? "medium" : diff.toLowerCase());

            String reqPack = coalesce(htmlEl.attr("data-required-pack"), htmlEl.attr("data-pack"));
            result.setRequiredPack(reqPack.isBlank() ? "free" : reqPack.toLowerCase());

            String audio = htmlEl.attr("data-audio");
            if (!audio.isBlank()) result.setAudioUrl(audio);
        }

        // Fallback: <title> tag
        if (isBlank(result.getExamTitle())) {
            Element titleEl = doc.selectFirst("title");
            if (titleEl != null) result.setExamTitle(titleEl.text().trim());
        }

        // Fallback: meta lmshub:*
        if (isBlank(result.getExamType())) result.setExamType(metaContent(doc, "lmshub:exam"));
        if (isBlank(result.getHtmlVersion())) result.setHtmlVersion(metaContent(doc, "lmshub:format"));
        if (isBlank(result.getExamTitle())) result.setExamTitle(metaContent(doc, "lmshub:title"));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Media extraction
    // ═════════════════════════════════════════════════════════════════════════

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
            final String finalRef = ref;
            boolean alreadyAdded = result.getMediaAssets().stream()
                    .anyMatch(a -> finalRef.equals(a.getRefId()));
            if (!alreadyAdded) {
                ParseResult.MediaAsset asset = new ParseResult.MediaAsset();
                asset.setRefId(finalRef);
                asset.setOriginalName(mediaEl.attr("data-name"));
                String src = mediaEl.attr("data-src");
                if (src.startsWith("data:")) {
                    String[] parts = src.split(",", 2);
                    String meta = parts[0];
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

    // ═════════════════════════════════════════════════════════════════════════
    // Utility helpers
    // ═════════════════════════════════════════════════════════════════════════

    private String firstHeading(Element el) {
        Element h = el.selectFirst("h1, h2, h3");
        return h != null ? h.text().trim() : "";
    }

    private String coalesce(String... vals) {
        for (String v : vals) if (v != null && !v.isBlank()) return v;
        return "";
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
