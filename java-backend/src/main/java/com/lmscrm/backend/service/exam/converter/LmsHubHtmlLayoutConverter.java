package com.lmscrm.backend.service.exam.converter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LmsHubHtmlLayoutConverter — Multi-Layout Context-Aware HTML Layout Converter.
 *
 * Guaranteed Global ID Uniqueness across all sections and passages.
 * Prevents double DOM traversal by scoping candidate searches to individual passage containers.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LmsHubHtmlLayoutConverter {

    private final HtmlLayoutDetector layoutDetector;

    public String convertToLmsHubSpecification(byte[] htmlBytes, String examTitle, String examType) {
        String rawHtml = new String(htmlBytes, StandardCharsets.UTF_8);
        HtmlLayoutDetector.HtmlLayoutType layoutType = layoutDetector.detectLayout(rawHtml);
        
        log.info("==================================================");
        log.info("[HTML Auto Analyzer] Detected Layout: {}", layoutType);
        log.info("==================================================");

        Document doc = Jsoup.parse(rawHtml);

        // 1. Ensure root <html> metadata
        Element htmlEl = doc.selectFirst("html");
        if (htmlEl == null) {
            doc.append("<html data-format=\"lmshub-v1\"></html>");
            htmlEl = doc.selectFirst("html");
        }

        if (!htmlEl.hasAttr("data-format")) {
            htmlEl.attr("data-format", "lmshub-v1");
        }
        if (!htmlEl.hasAttr("data-exam")) {
            htmlEl.attr("data-exam", examType != null && !examType.isBlank() ? examType : "IELTS");
        }
        if (!htmlEl.hasAttr("data-title")) {
            htmlEl.attr("data-title", examTitle != null && !examTitle.isBlank() ? examTitle : "LMSHub Exam");
        }
        if (!htmlEl.hasAttr("data-subject")) {
            htmlEl.attr("data-subject", "Reading");
        }
        if (!htmlEl.hasAttr("data-duration")) {
            htmlEl.attr("data-duration", "60");
        }

        // 2. Return unchanged if <lmshub-section> already present
        Elements existingSections = doc.select("lmshub-section");
        if (!existingSections.isEmpty()) {
            return doc.outerHtml();
        }

        // 3. Inject static <lmshub-*> elements using multi-layout rules
        Element body = doc.body();
        if (body == null) {
            body = doc.appendElement("body");
        }

        injectLmsHubTags(doc, body, rawHtml, layoutType);

        return doc.outerHtml();
    }

    private void injectLmsHubTags(Document doc, Element body, String rawHtml, HtmlLayoutDetector.HtmlLayoutType layoutType) {
        Elements passageContainers = doc.select(".passage, .passage-block, section, article, [data-passage-id], .reading-text, #passage-content, .cambridge-passage, .bc-passage");

        // Global question order counter and ID set across entire exam
        AtomicInteger globalQOrder = new AtomicInteger(1);
        Set<String> globalQuestionIds = new HashSet<>();

        if (passageContainers.isEmpty()) {
            Element sec = doc.createElement("lmshub-section");
            sec.attr("data-id", "sec_1");
            sec.attr("data-title", "Section 1");
            sec.attr("data-order", "1");

            Element instr = doc.createElement("lmshub-instructions");
            instr.text("Read the passage carefully and answer the questions.");
            sec.appendChild(instr);

            Element passage = doc.createElement("lmshub-passage");
            Element passageTextEl = doc.selectFirst(".passage-text, #passage-content, .content-box, main, body");
            if (passageTextEl != null && !passageTextEl.text().isBlank()) {
                passage.text(passageTextEl.text());
            } else {
                passage.text("Passage Content");
            }
            sec.appendChild(passage);

            // Scope question extraction to doc (single section)
            extractAndAppendQuestions(doc, doc, sec, rawHtml, globalQOrder, globalQuestionIds, 1);

            body.appendChild(sec);
        } else {
            int secOrder = 1;
            for (Element pUi : passageContainers) {
                Element sec = doc.createElement("lmshub-section");
                sec.attr("data-id", "passage_" + secOrder);
                sec.attr("data-title", pUi.attr("data-title").isEmpty() ? "Passage " + secOrder : pUi.attr("data-title"));
                sec.attr("data-order", String.valueOf(secOrder));

                Element passage = doc.createElement("lmshub-passage");
                passage.text(pUi.text());
                sec.appendChild(passage);

                // CRITICAL FIX: Scope candidate search strictly to pUi container (NOT doc!)
                extractAndAppendQuestions(doc, pUi, sec, rawHtml, globalQOrder, globalQuestionIds, secOrder);

                body.appendChild(sec);
                secOrder++;
            }
        }
    }

    private void extractAndAppendQuestions(Document doc,
                                           Element container,
                                           Element section,
                                           String rawHtml,
                                           AtomicInteger globalQOrder,
                                           Set<String> globalQuestionIds,
                                           int secOrder) {

        // Scope search to container ONLY to prevent duplicate DOM traversal
        Elements uiCandidates = container.select(
            ".q-item, .question, .question-item, .ielts-question, .q-block, .fozilbek-q, .bc-question, .cambridge-q, [data-q-id], [id^=q], .q-box, tr.question-row"
        );

        int candidateCount = uiCandidates.size();
        int ignoredHeaders = 0;
        int ignoredEmpty = 0;
        int parsedCount = 0;

        Map<String, Integer> parsedTypeCounts = new HashMap<>();

        for (Element candidate : uiCandidates) {
            String rawText = candidate.text().trim();
            if (rawText.isBlank()) {
                ignoredEmpty++;
                continue;
            }

            if (isGroupHeaderOrInstruction(rawText, candidate)) {
                ignoredHeaders++;
                log.debug("Ignored Header/Instruction block: '{}'", rawText);
                continue;
            }

            int currentOrder = globalQOrder.get();
            Element qEl = parseRealQuestionContextAware(doc, candidate, currentOrder, globalQuestionIds, secOrder);
            if (qEl != null) {
                section.appendChild(qEl);
                globalQOrder.incrementAndGet();

                String qType = qEl.attr("data-type");
                parsedTypeCounts.put(qType, parsedTypeCounts.getOrDefault(qType, 0) + 1);
                parsedCount++;
            }
        }

        // Fallback: Regex extraction if DOM candidate search yielded 0 questions across doc
        if (globalQOrder.get() == 1 && container == doc) {
            log.info("No DOM question elements found in container. Attempting regex extraction for JS AnswerKey...");
            
            // Scope search strictly inside AK block: const AK = { ... };
            Matcher akBlockMatcher = Pattern.compile("(?:const\\s+)?AK\\s*=\\s*\\{([^}]+)\\}").matcher(rawHtml);
            String searchContent = akBlockMatcher.find() ? akBlockMatcher.group(1) : rawHtml;

            Pattern akPattern = Pattern.compile("\"?(\\d+)\"?\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
            Matcher matcher = akPattern.matcher(searchContent);

            while (matcher.find()) {
                int currentOrder = globalQOrder.get();
                String rawQId = matcher.group(1);
                String ansText = matcher.group(2).trim();

                String qId = "q_" + currentOrder;

                if (globalQuestionIds.contains(qId)) {
                    throw new IllegalStateException("Duplicate question id detected during layout conversion: " + qId);
                }
                globalQuestionIds.add(qId);

                log.info("Adding Question (Regex Fallback): ID='{}', Order={}, Text='Question {}', DOM Path='JS_Regex'",
                        qId, currentOrder, currentOrder);

                Element q = doc.createElement("lmshub-question");
                q.attr("data-id", qId);
                q.attr("data-order", String.valueOf(currentOrder));
                q.attr("data-points", "1");

                Element text = doc.createElement("lmshub-text");
                text.text("Question " + currentOrder);
                q.appendChild(text);

                String upperAns = ansText.toUpperCase();
                if (upperAns.equals("TRUE") || upperAns.equals("FALSE") || upperAns.equals("NOT GIVEN")) {
                    q.attr("data-type", "TRUE_FALSE_NG");
                    addTfngOptions(doc, q, upperAns, false);
                } else if (upperAns.equals("YES") || upperAns.equals("NO")) {
                    q.attr("data-type", "YES_NO_NG");
                    addTfngOptions(doc, q, upperAns, true);
                } else {
                    q.attr("data-type", "FILL_BLANK");
                }

                Element ans = doc.createElement("lmshub-answer");
                ans.text(ansText);
                q.appendChild(ans);

                section.appendChild(q);
                globalQOrder.incrementAndGet();
                parsedCount++;
            }
        }

        // Print Diagnostic Summary Log
        log.info("Diagnostic Summary Log (Container Section {}):", secOrder);
        log.info("  Found Candidates in Container: {}", candidateCount);
        log.info("  Ignored Headers/Blocks       : {}", ignoredHeaders);
        log.info("  Ignored Empty Containers     : {}", ignoredEmpty);
        log.info("  Parsed Questions Breakdown   :");
        for (Map.Entry<String, Integer> entry : parsedTypeCounts.entrySet()) {
            log.info("    - {:18} : {}", entry.getKey(), entry.getValue());
        }
        log.info("  Total Parsed Questions       : {}", parsedCount);
        log.info("==================================================");
    }

    private boolean isGroupHeaderOrInstruction(String text, Element el) {
        if (text.isBlank()) return true;

        // Skip headers like "Questions 1-5", "Questions 14-20"
        if (text.matches("(?i)^Questions?\\s+\\d+([–-]\\d+)?\\s*$")) return true;
        if (text.matches("(?i)^READING PASSAGE \\d+.*$") && el.select("input, select, .option, label").isEmpty()) return true;

        // Container without any input, select, textarea, or option label
        boolean hasInputs = !el.select("input, select, textarea, label.choice, .option, .opt, label:has(input)").isEmpty();
        boolean hasPrompt = el.selectFirst(".q-text, .question-text, .q-prompt, label.q-label, p, strong, h4, h3, h5, .statement") != null;

        return !hasInputs && !hasPrompt && !el.hasAttr("data-q-id");
    }

    private Element parseRealQuestionContextAware(Document doc,
                                                  Element qUi,
                                                  int globalOrder,
                                                  Set<String> globalQuestionIds,
                                                  int secOrder) {

        // Multi-structure Prompt Extractor: .q-text, .question-text, .q-prompt, label.q-label, p, strong, h4, h3, h5, .statement
        String prompt = extractPromptText(qUi);
        if (prompt.isBlank()) {
            log.info("Question Order #{}: Ignored. Reason: No prompt text found.", globalOrder);
            return null;
        }

        // Globally unique question ID generation across entire exam (e.g. q_1, q_2, ... q_40)
        String qId = "q_" + globalOrder;

        // STRICT VALIDATION: Throw IllegalStateException if duplicate ID generated
        if (globalQuestionIds.contains(qId)) {
            throw new IllegalStateException("Duplicate question id detected during layout conversion: " + qId);
        }

        // LOG BEFORE ADDING QUESTION
        log.info("Adding Question: ID='{}', Order={}, Text='{}', DOM Path='{}'",
                qId, globalOrder, truncate(prompt, 60), qUi.cssSelector());

        globalQuestionIds.add(qId);

        // Options Extractor: <select><option>, <input type="radio/checkbox">, label.choice, .option, .opt
        Elements optElements = qUi.select(".option, .opt, label.choice, label:has(input), select option");

        Element q = doc.createElement("lmshub-question");
        q.attr("data-id", qId);
        q.attr("data-order", String.valueOf(globalOrder));
        q.attr("data-points", "1");

        // Question text tag
        Element textTag = doc.createElement("lmshub-text");
        textTag.text(prompt);
        q.appendChild(textTag);

        char labelChar = 'A';
        for (Element optEl : optElements) {
            String optText = optEl.text().trim();
            if (optText.isBlank() || optText.equalsIgnoreCase("select")) continue;

            Element optTag = doc.createElement("lmshub-option");
            optTag.attr("data-label", String.valueOf(labelChar++));
            boolean isCorrect = optEl.hasClass("correct") || "true".equalsIgnoreCase(optEl.attr("data-correct"));
            optTag.attr("data-correct", String.valueOf(isCorrect));
            optTag.text(optText);
            q.appendChild(optTag);
        }

        int optionCount = q.select("lmshub-option").size();
        boolean hasSelect = !qUi.select("select").isEmpty();
        boolean hasTextInput = !qUi.select("input[type=text], textarea").isEmpty();

        // Context-Aware Question Type Recognition:
        String qType;
        if (hasSelect) {
            String qTextUpper = prompt.toUpperCase();
            if (qTextUpper.contains("HEADING") || qTextUpper.contains("PARAGRAPH")) {
                qType = "HEADING_MATCH";
            } else if (qTextUpper.contains("SUMMARY") || qTextUpper.contains("COMPLETE")) {
                qType = "FILL_BLANK";
            } else {
                qType = "MATCHING";
            }
        } else if (optionCount >= 2) {
            String firstOptText = q.select("lmshub-option").first().text().toUpperCase();
            if (firstOptText.contains("TRUE") || firstOptText.contains("FALSE") || firstOptText.contains("NOT GIVEN")) {
                qType = "TRUE_FALSE_NG";
            } else if (firstOptText.contains("YES") || firstOptText.contains("NO")) {
                qType = "YES_NO_NG";
            } else {
                qType = "SINGLE_CHOICE";
            }
        } else if (hasTextInput || optionCount == 0) {
            qType = "FILL_BLANK";
        } else {
            qType = "FILL_BLANK";
        }

        // NO FAKE OPTIONS: If MCQ type has fewer than 2 options, reclassify to FILL_BLANK instead of adding dummy options!
        if ((qType.equals("SINGLE_CHOICE") || qType.equals("MULTIPLE_CHOICE")) && optionCount < 2) {
            log.info("Question Order #{}: Reclassified from {} to FILL_BLANK due to insufficient options ({})", globalOrder, qType, optionCount);
            qType = "FILL_BLANK";
        }

        q.attr("data-type", qType);

        // Answer tag
        Element answerUi = qUi.selectFirst(".answer, .correct-answer, [data-answer]");
        Element ansTag = doc.createElement("lmshub-answer");
        if (answerUi != null && !answerUi.text().isBlank()) {
            ansTag.text(answerUi.text().trim());
        } else {
            ansTag.text("");
        }
        q.appendChild(ansTag);

        return q;
    }

    private String extractPromptText(Element qUi) {
        Element promptEl = qUi.selectFirst(".q-text, .question-text, .q-prompt, label.q-label, p, strong, h4, h3, h5, .statement");
        if (promptEl != null && !promptEl.text().isBlank()) {
            String pText = promptEl.text().trim();
            if (!pText.matches("(?i)^Questions?\\s+\\d+.*$")) {
                return pText;
            }
        }

        String text = qUi.text().trim();
        if (!text.matches("(?i)^Questions?\\s+\\d+.*$")) {
            return text;
        }
        return "";
    }

    private void addTfngOptions(Document doc, Element q, String upperAns, boolean isYesNo) {
        String opt1 = isYesNo ? "YES" : "TRUE";
        String opt2 = isYesNo ? "NO" : "FALSE";
        String opt3 = "NOT GIVEN";

        Element o1 = doc.createElement("lmshub-option");
        o1.attr("data-label", opt1);
        o1.attr("data-correct", String.valueOf(opt1.equals(upperAns)));
        o1.text(opt1);
        q.appendChild(o1);

        Element o2 = doc.createElement("lmshub-option");
        o2.attr("data-label", opt2);
        o2.attr("data-correct", String.valueOf(opt2.equals(upperAns)));
        o2.text(opt2);
        q.appendChild(o2);

        Element o3 = doc.createElement("lmshub-option");
        o3.attr("data-label", opt3);
        o3.attr("data-correct", String.valueOf(opt3.equals(upperAns)));
        o3.text(opt3);
        q.appendChild(o3);
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }
}
