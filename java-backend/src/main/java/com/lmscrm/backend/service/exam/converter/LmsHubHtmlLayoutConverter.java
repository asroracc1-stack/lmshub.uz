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
 * LmsHubHtmlLayoutConverter — Production-Grade Browser-Style HTML Compiler.
 *
 * Reconstructs, classifies, and compiles legacy IELTS HTML files (Cambridge, British Council, IDP, etc.)
 * into canonical LMSHub v1 Specification format without design or CSS styling dependencies.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LmsHubHtmlLayoutConverter {

    private final HtmlLayoutDetector layoutDetector;

    public enum HTMLProfile {
        CAMBRIDGE, IELTSHUB, BRITISH_COUNCIL, IDP, LMSHUB_LEGACY, UNKNOWN
    }

    private static class DetectedQuestion {
        String qId;
        int order;
        String prompt;
        String type;
        List<String> options = new ArrayList<>();
        List<String> answers = new ArrayList<>();
        Element originalElement;
    }

    public String convertToLmsHubSpecification(byte[] htmlBytes, String examTitle, String examType) {
        String rawHtml = new String(htmlBytes, StandardCharsets.UTF_8);
        HTMLProfile profile = profileHtml(rawHtml);
        log.info("[HTML Auto Analyzer] Detected Profile: {}", profile);

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

        Element body = doc.body();
        if (body == null) {
            body = doc.appendElement("body");
        }

        // 3. Fallback for dynamic/JS passages
        if (tryConvertJsPassages(doc, body, rawHtml)) {
            return doc.outerHtml();
        }

        // 4. Resolve Answer Graph
        Map<Integer, String> akMap = resolveAnswerGraph(rawHtml, doc);

        // 5. Compile media assets globally
        AtomicInteger mediaCounter = new AtomicInteger(0);
        compileMedia(doc, body, mediaCounter);

        // 6. Partition sections
        List<Element> sectionsList = new ArrayList<>();
        
        // Detect split panel text and questions first
        Elements textSections = doc.select(".text-section, .text_section, .passage-section, .passage_section, #passage");
        Elements questSections = doc.select(".question-section, .question_section, .questions-section, .questions_section, #questions");
        
        if (!textSections.isEmpty() && !questSections.isEmpty()) {
            for (int i = 0; i < textSections.size(); i++) {
                Element ts = textSections.get(i);
                Element qs = i < questSections.size() ? questSections.get(i) : null;
                
                Element secContainer = doc.createElement("div");
                Element header = ts.selectFirst("h1, h2, h3");
                String title = header != null ? header.text().trim() : "";
                secContainer.attr("data-title", title);
                
                Element pWrap = doc.createElement("div");
                pWrap.addClass("passage-block");
                pWrap.html(ts.html());
                secContainer.appendChild(pWrap);
                
                if (qs != null) {
                    Element qWrap = doc.createElement("div");
                    qWrap.addClass("questions-block");
                    qWrap.html(qs.html());
                    secContainer.appendChild(qWrap);
                }
                sectionsList.add(secContainer);
            }
        }
        
        if (sectionsList.isEmpty()) {
            Elements explicitContainers = doc.select(".passage, .passage-block, section, article, [data-passage-id], .reading-text, #passage-content, .cambridge-passage, .bc-passage");
            if (!explicitContainers.isEmpty()) {
                for (Element el : explicitContainers) {
                    sectionsList.add(el.clone());
                }
            }
        }
        
        if (sectionsList.isEmpty()) {
            // Find splitting headings
            Elements siblings = body.children();
            Element currentSectionContainer = null;
            for (Element child : siblings) {
                boolean isSeparator = child.tagName().matches("h[1-4]") && 
                                      child.text().matches("(?i).*(Passage|Section|Part)\\s*(\\d+|[I|V|X]+|[A-C]).*");
                if (isSeparator) {
                    if (currentSectionContainer != null) {
                        sectionsList.add(currentSectionContainer);
                    }
                    currentSectionContainer = doc.createElement("div");
                    currentSectionContainer.attr("data-title", child.text().trim());
                }
                if (currentSectionContainer != null) {
                    currentSectionContainer.appendChild(child.clone());
                }
            }
            if (currentSectionContainer != null) {
                sectionsList.add(currentSectionContainer);
            }
        }
        
        if (sectionsList.isEmpty()) {
            // Fallback: whole body is a single section
            Element singleSec = doc.createElement("div");
            singleSec.attr("data-title", examTitle != null ? examTitle : "Reading Passage 1");
            singleSec.html(body.html());
            sectionsList.add(singleSec);
        }

        // Clear existing body contents so we can output standard LMSHub specification elements
        body.empty();

        int secOrder = 1;
        AtomicInteger globalQOrder = new AtomicInteger(1);
        Set<String> globalQuestionIds = new HashSet<>();

        for (Element sectionContainer : sectionsList) {
            Element sec = doc.createElement("lmshub-section");
            sec.attr("data-id", "sec_" + secOrder);
            String title = sectionContainer.attr("data-title");
            if (title.isEmpty()) {
                title = sectionContainer.attr("title");
            }
            if (title.isEmpty()) {
                title = "Passage " + secOrder;
            }
            sec.attr("data-title", title);
            sec.attr("data-order", String.valueOf(secOrder));

            // Split into passage and questions
            Element passageEl = doc.createElement("lmshub-passage");
            Element questionsEl = doc.createElement("div");
            questionsEl.addClass("questions-container");

            Element explicitPassageBlock = sectionContainer.selectFirst(".passage-block");
            Element explicitQuestionsBlock = sectionContainer.selectFirst(".questions-block");
            
            if (explicitPassageBlock != null && explicitQuestionsBlock != null) {
                passageEl.html(explicitPassageBlock.html());
                questionsEl.html(explicitQuestionsBlock.html());
            } else {
                boolean questionsStarted = false;
                for (Element child : sectionContainer.children()) {
                    boolean isQuestionHeader = child.text().matches("(?i).*Questions?\\s+\\d+.*") || 
                                               !child.select("input, select, textarea").isEmpty();
                    if (isQuestionHeader) {
                        questionsStarted = true;
                    }
                    if (questionsStarted) {
                        questionsEl.appendChild(child);
                    } else {
                        passageEl.appendChild(child);
                    }
                }
            }

            // Fallback if split was empty
            if (passageEl.children().isEmpty()) {
                passageEl.text("Passage text content.");
            }
            if (questionsEl.children().isEmpty()) {
                // Move everything to questions if no splits occurred
                questionsEl.html(sectionContainer.html());
            }

            // Instructions
            Element instr = doc.createElement("lmshub-instructions");
            Element instrEl = questionsEl.selectFirst("h2, h3, p, div");
            if (instrEl != null && instrEl.text().matches("(?i).*Questions?\\s+\\d+.*")) {
                instr.text(instrEl.text().trim());
                instrEl.remove();
            } else {
                instr.text("Read the passage carefully and answer the questions.");
            }
            sec.appendChild(instr);

            // Segment and wrap paragraphs in passage
            segmentPassage(doc, passageEl);
            sec.appendChild(passageEl);

            // Extract questions
            List<DetectedQuestion> detectedQuestions = compileQuestions(doc, questionsEl, globalQOrder, akMap);

            // Auto-repair empty section validation
            if (detectedQuestions.isEmpty()) {
                log.warn("Section {} has no questions! Generating a fallback dummy question.", secOrder);
                DetectedQuestion dq = new DetectedQuestion();
                dq.order = globalQOrder.getAndIncrement();
                dq.qId = "question-" + String.format("%04d", dq.order);
                dq.prompt = "Answer the reading passage questions.";
                dq.type = "FILL_BLANK";
                dq.answers.add("TBD");
                detectedQuestions.add(dq);
            }

            for (DetectedQuestion dq : detectedQuestions) {
                // Prevent duplicate IDs
                while (globalQuestionIds.contains(dq.qId)) {
                    dq.order = globalQOrder.getAndIncrement();
                    dq.qId = "question-" + String.format("%04d", dq.order);
                }
                globalQuestionIds.add(dq.qId);

                Element q = doc.createElement("lmshub-question");
                q.attr("data-id", dq.qId);
                q.attr("data-type", dq.type);
                q.attr("data-order", String.valueOf(dq.order));
                q.attr("data-points", "1");

                Element textTag = doc.createElement("lmshub-text");
                textTag.text(dq.prompt);
                q.appendChild(textTag);

                // Add options if single/multiple choice or matching
                if (!dq.options.isEmpty()) {
                    char labelChar = 'A';
                    for (String optText : dq.options) {
                        String cleanedText = optText.trim();
                        String label = String.valueOf(labelChar++);
                        
                        // Parse label prefixes: "A. Option Text" -> label A, text "Option Text"
                        if (optText.matches("(?i)^[A-H][\\s\\.\\)\\-].*")) {
                            label = optText.substring(0, 1).toUpperCase();
                            cleanedText = optText.substring(2).trim();
                        }

                        // Determine correctness based on option label, text or graph answers
                        boolean isCorrect = false;
                        for (String correctAns : dq.answers) {
                            String cUpper = correctAns.toUpperCase().trim();
                            if (label.equalsIgnoreCase(cUpper) || cleanedText.toUpperCase().trim().equals(cUpper)) {
                                isCorrect = true;
                                break;
                            }
                        }

                        Element optTag = doc.createElement("lmshub-option");
                        optTag.attr("data-label", label);
                        optTag.attr("data-correct", String.valueOf(isCorrect));
                        optTag.text(cleanedText);
                        q.appendChild(optTag);
                    }
                }

                // Append correct answers
                if (dq.answers.size() > 1) {
                    int bIdx = 1;
                    for (String ans : dq.answers) {
                        Element ansTag = doc.createElement("lmshub-answer");
                        ansTag.attr("data-blank", String.valueOf(bIdx++));
                        ansTag.text(ans);
                        q.appendChild(ansTag);
                    }
                } else {
                    Element ansTag = doc.createElement("lmshub-answer");
                    String ans = dq.answers.isEmpty() ? "TBD" : dq.answers.get(0);
                    ansTag.text(ans);
                    q.appendChild(ansTag);
                }

                sec.appendChild(q);
            }

            body.appendChild(sec);
            secOrder++;
        }

        return doc.outerHtml();
    }

    private HTMLProfile profileHtml(String rawHtml) {
        String upper = rawHtml.toUpperCase();
        if (upper.contains("CAMBRIDGE") || upper.contains("CLASS=\"CAMBRIDGE-")) {
            return HTMLProfile.CAMBRIDGE;
        } else if (upper.contains("FOZILBEK") || upper.contains("IELTSHUB") || upper.contains("CLASS=\"FOZILBEK-")) {
            return HTMLProfile.IELTSHUB;
        } else if (upper.contains("BRITISH COUNCIL") || upper.contains("BRITISHCOUNCIL") || upper.contains("CLASS=\"BC-")) {
            return HTMLProfile.BRITISH_COUNCIL;
        } else if (upper.contains("IDP")) {
            return HTMLProfile.IDP;
        } else if (upper.contains("LMSHUB-SECTION") || upper.contains("DATA-FORMAT=\"LMSHUB-V1\"")) {
            return HTMLProfile.LMSHUB_LEGACY;
        }
        return HTMLProfile.UNKNOWN;
    }

    private Map<Integer, String> resolveAnswerGraph(String rawHtml, Document doc) {
        Map<Integer, String> akMap = new HashMap<>();

        // Match key-value mappings like "1": "TRUE" or q1: "TRUE"
        Pattern pattern = Pattern.compile("[\"']?(?:q|question)?_?(\\d+)[\"']?\\s*:\\s*[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
        
        Elements scripts = doc.select("script");
        for (Element script : scripts) {
            String scriptText = script.html();
            Matcher m = pattern.matcher(scriptText);
            while (m.find()) {
                try {
                    int qNum = Integer.parseInt(m.group(1));
                    String ans = m.group(2).trim();
                    if (!akMap.containsKey(qNum)) {
                        akMap.put(qNum, ans);
                    }
                } catch (NumberFormatException ignored) {}
            }
            
            // Look for array assignments: answers = ["TRUE", "FALSE", ...] (1-based index)
            Pattern arrayPattern = Pattern.compile("(?:answers|keys|ak)\\s*=\\s*\\[([^\\]]+)\\]", Pattern.CASE_INSENSITIVE);
            Matcher am = arrayPattern.matcher(scriptText);
            if (am.find()) {
                String arrayContent = am.group(1);
                String[] items = arrayContent.split(",");
                for (int i = 0; i < items.length; i++) {
                    String ans = items[i].replace("\"", "").replace("'", "").trim();
                    if (!ans.isEmpty()) {
                        akMap.put(i + 1, ans);
                    }
                }
            }
        }

        // Hidden inputs
        Elements hiddenInputs = doc.select("input[type=hidden]");
        for (Element input : hiddenInputs) {
            String name = input.attr("name").toLowerCase();
            String id = input.attr("id").toLowerCase();
            String val = input.attr("value").trim();
            if (val.isEmpty()) continue;

            Matcher numMatcher = Pattern.compile("\\d+").matcher(name + " " + id);
            if (numMatcher.find()) {
                try {
                    int qNum = Integer.parseInt(numMatcher.group());
                    if (!akMap.containsKey(qNum)) {
                        akMap.put(qNum, val);
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        // Table answers
        Elements tables = doc.select("table");
        for (Element table : tables) {
            Elements cells = table.select("td, th");
            for (int i = 0; i < cells.size(); i++) {
                String text = cells.get(i).text().trim();
                if (text.matches("^\\d+$") && i + 1 < cells.size()) {
                    try {
                        int qNum = Integer.parseInt(text);
                        String ans = cells.get(i + 1).text().trim();
                        if (!ans.isEmpty() && !ans.matches("^\\d+$") && ans.length() < 50) {
                            if (!akMap.containsKey(qNum)) {
                                akMap.put(qNum, ans);
                            }
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        if (akMap.isEmpty()) {
            Matcher m = pattern.matcher(rawHtml);
            while (m.find()) {
                try {
                    int qNum = Integer.parseInt(m.group(1));
                    String ans = m.group(2).trim();
                    log.info("Found fallback key: {} -> {}", qNum, ans);
                    if (!akMap.containsKey(qNum)) {
                        akMap.put(qNum, ans);
                    }
                } catch (NumberFormatException ignored) {}
            }
        }

        log.info("Answer Key Resolver: Resolved {} keys in the answer graph.", akMap.size());
        return akMap;
    }

    private void segmentPassage(Document doc, Element passageEl) {
        Elements children = passageEl.children();
        for (Element child : children) {
            String text = child.text().trim();
            Pattern pattern = Pattern.compile("^\\s*([A-H])(?:[\\.\\s\\)]|\\s*$|\\s+Paragraph|Paragraph\\s+)");
            Matcher m = pattern.matcher(text);
            
            Element firstBold = child.selectFirst("strong, b, span.paragraph-letter");
            String letter = "";
            if (firstBold != null && firstBold.text().trim().matches("^[A-H]$")) {
                letter = firstBold.text().trim().toUpperCase();
            } else if (m.find()) {
                letter = m.group(1).toUpperCase();
            }
            
            if (!letter.isEmpty()) {
                child.attr("data-letter", letter);
                child.addClass("passage-paragraph");
                log.info("Segmented passage paragraph: Letter '{}'", letter);
            }
        }
    }

    private List<DetectedQuestion> compileQuestions(Document doc, Element questionsEl, AtomicInteger globalQOrder, Map<Integer, String> akMap) {
        List<DetectedQuestion> detectedQuestions = new ArrayList<>();
        
        List<Element> questionContainers = new ArrayList<>();
        Elements controls = questionsEl.select("input[type=text], input[type=radio], input[type=checkbox], select, textarea");
        
        List<Element> activeControls = new ArrayList<>();
        for (Element ctrl : controls) {
            String type = ctrl.attr("type").toLowerCase();
            if (type.equals("hidden") || type.equals("submit") || type.equals("button")) {
                continue;
            }
            activeControls.add(ctrl);
        }
        
        Set<Element> seenContainers = new LinkedHashSet<>();
        for (Element ctrl : activeControls) {
            Element container = ctrl;
            while (container != null && !container.tagName().equals("body") && container != questionsEl) {
                String tag = container.tagName().toLowerCase();
                if (tag.equals("li") || tag.equals("tr") || tag.equals("p") || (tag.equals("div") && !container.hasClass("questions-container"))) {
                    break;
                }
                container = container.parent();
            }
            if (container != null && container != questionsEl && !container.tagName().equals("body")) {
                seenContainers.add(container);
            } else {
                seenContainers.add(ctrl);
            }
        }
        questionContainers.addAll(seenContainers);

        Elements classCandidates = questionsEl.select(".q-item, .question, .question-item, .ielts-question, .q-block, .fozilbek-q, .bc-question, .cambridge-q, [data-q-id], [id^=q], .q-box");
        for (Element cand : classCandidates) {
            boolean overlap = false;
            for (Element existing : seenContainers) {
                if (existing == cand || elementContains(existing, cand) || elementContains(cand, existing)) {
                    overlap = true;
                    break;
                }
            }
            if (!overlap && !cand.text().trim().isEmpty()) {
                questionContainers.add(cand);
            }
        }

        questionContainers.sort((a, b) -> Integer.compare(getElementIndex(questionsEl, a), getElementIndex(questionsEl, b)));

        for (Element container : questionContainers) {
            DetectedQuestion dq = new DetectedQuestion();
            
            int qNum = extractQuestionNumber(container, globalQOrder.get());
            dq.order = qNum;
            dq.qId = "question-" + String.format("%04d", qNum);
            dq.prompt = cleanPrompt(container);
            dq.options = extractOptions(container);

            boolean hasRadio = !container.select("input[type=radio]").isEmpty();
            boolean hasCheckbox = !container.select("input[type=checkbox]").isEmpty();
            boolean hasSelect = !container.select("select").isEmpty();
            
            String qType = "FILL_BLANK";
            if (hasRadio) {
                String promptUpper = dq.prompt.toUpperCase();
                if (promptUpper.contains("TRUE") || promptUpper.contains("FALSE")) {
                    qType = "TRUE_FALSE_NG";
                } else if (promptUpper.contains("YES") || promptUpper.contains("NO")) {
                    qType = "YES_NO_NG";
                } else {
                    qType = "SINGLE_CHOICE";
                }
            } else if (hasCheckbox) {
                qType = "MULTIPLE_CHOICE";
            } else if (hasSelect) {
                qType = "MATCHING";
            }

            dq.type = deduceQuestionTypeFromInstructions(container, qType);

            // Reclassify SINGLE_CHOICE if it has insufficient options
            if (dq.type.contains("CHOICE") && dq.options.size() < 2) {
                dq.options = healMissingOptions(container);
                if (dq.options.size() < 2) {
                    dq.type = "FILL_BLANK";
                }
            }

            // Count blanks/inputs
            int numBlanks = 1;
            if (dq.type.equals("FILL_BLANK")) {
                int inputCount = container.select("input[type=text], textarea, select").size();
                if (inputCount > 0) {
                    numBlanks = inputCount;
                } else {
                    numBlanks = Math.max(1, countBlankPlaceholders(dq.prompt));
                }
            }

            for (int b = 0; b < numBlanks; b++) {
                String ans = akMap.get(qNum + b);
                if (ans == null || ans.isBlank()) {
                    Element answerUi = container.selectFirst(".answer, .correct-answer, [data-answer]");
                    if (answerUi != null && !answerUi.text().isBlank()) {
                        ans = answerUi.text().trim();
                    }
                }
                if (ans == null || ans.isBlank()) {
                    ans = "TBD";
                }
                dq.answers.add(ans);
            }

            detectedQuestions.add(dq);
            
            if (qNum + numBlanks > globalQOrder.get()) {
                globalQOrder.set(qNum + numBlanks);
            }
        }

        return detectedQuestions;
    }

    private List<String> healMissingOptions(Element container) {
        List<String> options = new ArrayList<>();
        Element sibling = container.nextElementSibling();
        int maxChecks = 5;
        while (sibling != null && maxChecks > 0) {
            String text = sibling.text().trim();
            if (text.matches("(?i)^[A-H][\\s\\.\\)\\-].*")) {
                options.add(text);
            } else if (!text.isEmpty()) {
                break;
            }
            sibling = sibling.nextElementSibling();
            maxChecks--;
        }
        return options;
    }

    private String cleanPrompt(Element container) {
        Element clone = container.clone();
        Elements controls = clone.select("input[type=text], textarea, select");
        for (Element ctrl : controls) {
            ctrl.replaceWith(new org.jsoup.nodes.TextNode(" [____] "));
        }
        clone.select("input[type=radio], input[type=checkbox]").remove();
        clone.select(".choice, .option, .opt, [class*=option], [class*=choice]").remove();
        clone.select("label").remove();
        
        String txt = clone.text().trim();
        txt = txt.replaceAll("\\s+", " ").trim();
        if (txt.isEmpty()) {
            txt = "Question prompt";
        }
        return txt;
    }

    private List<String> extractOptions(Element qUi) {
        List<String> options = new ArrayList<>();
        Elements labels = qUi.select("label");
        for (Element label : labels) {
            String txt = label.text().trim();
            Element inputInside = label.selectFirst("input");
            if (inputInside != null) {
                txt = label.text().replace(inputInside.text(), "").trim();
            }
            if (!txt.isEmpty() && !options.contains(txt)) {
                options.add(txt);
            }
        }
        
        Elements choices = qUi.select(".choice, .option, .opt, [class*=option], [class*=choice]");
        for (Element choice : choices) {
            String txt = choice.text().trim();
            if (!txt.isEmpty() && !options.contains(txt)) {
                options.add(txt);
            }
        }

        Elements selectOpts = qUi.select("select option");
        for (Element opt : selectOpts) {
            String txt = opt.text().trim();
            if (!txt.isEmpty() && !txt.equalsIgnoreCase("select") && !txt.contains("---") && !options.contains(txt)) {
                options.add(txt);
            }
        }
        
        if (options.isEmpty()) {
            Elements inputs = qUi.select("input[type=radio], input[type=checkbox]");
            for (Element input : inputs) {
                String txt = "";
                Element next = input.nextElementSibling();
                if (next != null && (next.tagName().matches("span|label|p|strong"))) {
                    txt = next.text().trim();
                } else {
                    txt = input.siblingElements().text().trim();
                }
                if (!txt.isEmpty() && !options.contains(txt)) {
                    options.add(txt);
                }
            }
        }
        return options;
    }

    private int extractQuestionNumber(Element container, int fallbackIndex) {
        String text = container.text().trim();
        Pattern p = Pattern.compile("^(?:Question|Q)?\\s*\\[?(\\d+)\\]?[\\s\\.\\):\\-]");
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (NumberFormatException ignored) {}
        }
        Element input = container.selectFirst("input, select, textarea");
        if (input != null) {
            String idStr = input.id();
            Matcher idMatcher = Pattern.compile("\\d+").matcher(idStr);
            if (idMatcher.find()) {
                try {
                    return Integer.parseInt(idMatcher.group());
                } catch (NumberFormatException ignored) {}
            }
        }
        return fallbackIndex;
    }

    private String deduceQuestionTypeFromInstructions(Element container, String defaultType) {
        Element prev = container.previousElementSibling();
        while (prev != null) {
            String text = prev.text().toUpperCase();
            if (prev.tagName().matches("h[1-4]") || text.matches("(?i).*Questions?\\s+\\d+.*")) {
                if (text.contains("TRUE") || text.contains("FALSE") || text.contains("NOT GIVEN")) {
                    return "TRUE_FALSE_NG";
                }
                if (text.contains("YES") || text.contains("NO")) {
                    return "YES_NO_NG";
                }
                if (text.contains("HEADING") || text.contains("MATCH THE HEADING")) {
                    return "HEADING_MATCH";
                }
                if (text.contains("MATCH") || text.contains("MATCHING")) {
                    return "MATCHING";
                }
                if (text.contains("CHOOSE") || text.contains("WRITE") || text.contains("FILL") || text.contains("COMPLETION") || text.contains("ONE WORD")) {
                    return "FILL_BLANK";
                }
                if (text.contains("MULTIPLE CHOICE") || text.contains("CHOOSE THE CORRECT LETTER")) {
                    return "SINGLE_CHOICE";
                }
                break; // Stop looking further if we hit another header or instruction block
            }
            prev = prev.previousElementSibling();
        }
        return defaultType;
    }

    private void compileMedia(Document doc, Element container, AtomicInteger mediaCounter) {
        Elements imgs = container.select("img");
        for (Element img : imgs) {
            String src = img.attr("src");
            if (src.isEmpty()) {
                src = img.attr("data-src");
            }
            if (src.isEmpty()) continue;

            String refId = "media_img_" + mediaCounter.incrementAndGet();
            Element mediaEl = doc.createElement("lmshub-media");
            mediaEl.attr("data-ref", refId);
            mediaEl.attr("data-src", src);
            mediaEl.attr("data-name", "image_" + mediaCounter.get() + ".png");
            
            img.replaceWith(mediaEl);
        }

        Elements pictures = container.select("picture");
        for (Element pic : pictures) {
            Element img = pic.selectFirst("img");
            String src = "";
            if (img != null) {
                src = img.attr("src");
                if (src.isEmpty()) src = img.attr("data-src");
            }
            if (src.isEmpty()) {
                Element source = pic.selectFirst("source");
                if (source != null) {
                    src = source.attr("srcset");
                }
            }
            if (src.isEmpty()) continue;

            String refId = "media_img_" + mediaCounter.incrementAndGet();
            Element mediaEl = doc.createElement("lmshub-media");
            mediaEl.attr("data-ref", refId);
            mediaEl.attr("data-src", src);
            mediaEl.attr("data-name", "image_" + mediaCounter.get() + ".png");

            pic.replaceWith(mediaEl);
        }

        Elements svgs = container.select("svg");
        for (Element svg : svgs) {
            String svgHtml = svg.outerHtml();
            String base64Svg = Base64.getEncoder().encodeToString(svgHtml.getBytes(StandardCharsets.UTF_8));
            String src = "data:image/svg+xml;base64," + base64Svg;

            String refId = "media_img_" + mediaCounter.incrementAndGet();
            Element mediaEl = doc.createElement("lmshub-media");
            mediaEl.attr("data-ref", refId);
            mediaEl.attr("data-src", src);
            mediaEl.attr("data-name", "vector_" + mediaCounter.get() + ".svg");

            svg.replaceWith(mediaEl);
        }
    }

    private int getElementIndex(Element root, Element target) {
        Elements all = root.getAllElements();
        return all.indexOf(target);
    }

    private boolean tryConvertJsPassages(Document doc, Element body, String rawHtml) {
        int passIdx = rawHtml.indexOf("PASSAGES");
        if (passIdx == -1) {
            return false;
        }

        String passScript = rawHtml.substring(passIdx);
        int endScript = passScript.indexOf("</script>");
        if (endScript != -1) passScript = passScript.substring(0, endScript);

        Map<Integer, String> pTitles = new LinkedHashMap<>();
        Map<Integer, String> pHtmls = new LinkedHashMap<>();

        for (int pNum = 1; pNum <= 10; pNum++) {
            int pKeyIdx = passScript.indexOf(pNum + ":");
            if (pKeyIdx == -1) pKeyIdx = passScript.indexOf("'" + pNum + "':");
            if (pKeyIdx == -1) pKeyIdx = passScript.indexOf("\"" + pNum + "\":");
            if (pKeyIdx == -1) continue;

            int titleIdx = passScript.indexOf("title:", pKeyIdx);
            if (titleIdx != -1 && titleIdx < pKeyIdx + 300) {
                int quoteStart = -1;
                char quoteChar = ' ';
                for (int i = titleIdx + 6; i < passScript.length(); i++) {
                    char c = passScript.charAt(i);
                    if (c == '`' || c == '\'' || c == '"') {
                        quoteStart = i;
                        quoteChar = c;
                        break;
                    }
                }
                if (quoteStart != -1) {
                    int quoteEnd = passScript.indexOf(quoteChar, quoteStart + 1);
                    if (quoteEnd != -1) {
                        String title = passScript.substring(quoteStart + 1, quoteEnd).trim();
                        pTitles.put(pNum, title);
                    }
                }
            }

            int htmlIdx = passScript.indexOf("html:", pKeyIdx);
            if (htmlIdx != -1 && htmlIdx < pKeyIdx + 500) {
                int quoteStart = -1;
                char quoteChar = ' ';
                for (int i = htmlIdx + 5; i < passScript.length(); i++) {
                    char c = passScript.charAt(i);
                    if (c == '`' || c == '\'' || c == '"') {
                        quoteStart = i;
                        quoteChar = c;
                        break;
                    }
                }
                if (quoteStart != -1) {
                    int quoteEnd = passScript.indexOf(quoteChar, quoteStart + 1);
                    if (quoteEnd != -1) {
                        String html = passScript.substring(quoteStart + 1, quoteEnd).trim();
                        pHtmls.put(pNum, html);
                    }
                }
            }
        }

        if (pHtmls.isEmpty()) {
            return false;
        }

        log.info("Successfully extracted {} dynamic JS passages from HTML!", pHtmls.size());

        Map<Integer, String> akMap = extractAnswerKeyMap(rawHtml);

        for (Map.Entry<Integer, String> entry : pHtmls.entrySet()) {
            int pNum = entry.getKey();
            String pTitle = pTitles.getOrDefault(pNum, "Passage " + pNum);
            String pHtml = entry.getValue();

            Element sec = doc.createElement("lmshub-section");
            sec.attr("data-id", "sec_" + pNum);
            sec.attr("data-title", "Passage " + pNum);
            sec.attr("data-order", String.valueOf(pNum));

            Element instr = doc.createElement("lmshub-instructions");
            instr.text("Read Passage " + pNum + " (" + pTitle + ") carefully and answer the questions.");
            sec.appendChild(instr);

            Element passage = doc.createElement("lmshub-passage");
            passage.attr("data-title", pTitle);
            passage.html(pHtml);
            sec.appendChild(passage);

            buildQuestionsForJsPassage(doc, sec, rawHtml, pNum, akMap);

            body.appendChild(sec);
        }

        return true;
    }

    private Map<Integer, String> extractAnswerKeyMap(String rawHtml) {
        Map<Integer, String> akMap = new HashMap<>();
        Matcher akBlockMatcher = Pattern.compile("(?:const\\s+)?AK\\s*=\\s*\\{([^}]+)\\}").matcher(rawHtml);
        String searchContent = akBlockMatcher.find() ? akBlockMatcher.group(1) : rawHtml;

        Matcher matcher = Pattern.compile("\"?(\\d+)\"?\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE).matcher(searchContent);
        while (matcher.find()) {
            try {
                int qNum = Integer.parseInt(matcher.group(1));
                String ans = matcher.group(2).trim();
                akMap.put(qNum, ans);
            } catch (NumberFormatException ignored) {}
        }
        return akMap;
    }

    private void buildQuestionsForJsPassage(Document doc, Element sec, String rawHtml, int pNum, Map<Integer, String> akMap) {
        String funcName = "function qP" + pNum;
        String qHtml = "";
        int funcIdx = rawHtml.indexOf(funcName);
        if (funcIdx != -1) {
            int endIdx = rawHtml.indexOf("function qP", funcIdx + 5);
            if (endIdx == -1) endIdx = rawHtml.indexOf("</script>", funcIdx);
            if (endIdx == -1) endIdx = rawHtml.length();
            qHtml = rawHtml.substring(funcIdx, endIdx);
        } else {
            qHtml = rawHtml;
        }

        Pattern tfngPattern = Pattern.compile("tfng\\s*\\(\\s*(\\d+)\\s*,\\s*['\"`](.*?)['\"`]", Pattern.DOTALL);
        Matcher tfngMatcher = tfngPattern.matcher(qHtml);
        while (tfngMatcher.find()) {
            int qNum = Integer.parseInt(tfngMatcher.group(1));
            String txt = tfngMatcher.group(2).trim();
            appendJsQuestion(doc, sec, qNum, txt, "TRUE_FALSE_NG", akMap.get(qNum), List.of("TRUE", "FALSE", "NOT GIVEN"));
        }

        Pattern yngngPattern = Pattern.compile("yngng\\s*\\(\\s*(\\d+)\\s*,\\s*['\"`](.*?)['\"`]", Pattern.DOTALL);
        Matcher yngngMatcher = yngngPattern.matcher(qHtml);
        while (yngngMatcher.find()) {
            int qNum = Integer.parseInt(yngngMatcher.group(1));
            String txt = yngngMatcher.group(2).trim();
            appendJsQuestion(doc, sec, qNum, txt, "YES_NO_NG", akMap.get(qNum), List.of("YES", "NO", "NOT GIVEN"));
        }

        Pattern mcqPattern = Pattern.compile("(?:pgQ|rsrQ|prsQ)\\s*\\(\\s*(\\d+)\\s*,\\s*['\"`](.*?)['\"`]", Pattern.DOTALL);
        Matcher mcqMatcher = mcqPattern.matcher(qHtml);
        while (mcqMatcher.find()) {
            int qNum = Integer.parseInt(mcqMatcher.group(1));
            String txt = mcqMatcher.group(2).trim();
            appendJsQuestion(doc, sec, qNum, txt, "SINGLE_CHOICE", akMap.get(qNum), List.of("A", "B", "C", "D", "E", "F", "G", "H"));
        }

        Pattern iiPattern = Pattern.compile("\\$\\{ii\\((\\d+)[^\\)]*\\)\\}");
        Matcher iiMatcher = iiPattern.matcher(qHtml);
        while (iiMatcher.find()) {
            int qNum = Integer.parseInt(iiMatcher.group(1));
            int matchStart = iiMatcher.start();
            int matchEnd = iiMatcher.end();

            int start = matchStart;
            while (start > 0) {
                if (qHtml.charAt(start) == '\n') {
                    break;
                }
                if (start >= 4 && qHtml.substring(start - 4, start).equalsIgnoreCase("<li>")) {
                    break;
                }
                if (start >= 4 && qHtml.substring(start - 4, start).equalsIgnoreCase("<td>")) {
                    break;
                }
                if (start >= 3 && qHtml.substring(start - 3, start).equalsIgnoreCase("<p>")) {
                    break;
                }
                start--;
            }

            int end = matchEnd;
            while (end < qHtml.length()) {
                if (qHtml.charAt(end) == '\n') {
                    break;
                }
                if (end + 5 <= qHtml.length() && qHtml.substring(end, end + 5).equalsIgnoreCase("</li>")) {
                    break;
                }
                if (end + 5 <= qHtml.length() && qHtml.substring(end, end + 5).equalsIgnoreCase("</td>")) {
                    break;
                }
                if (end + 4 <= qHtml.length() && qHtml.substring(end, end + 4).equalsIgnoreCase("</p>")) {
                    break;
                }
                end++;
            }

            String blockText = qHtml.substring(start, end);
            blockText = blockText.replaceAll("<[^>]+>", " ");
            blockText = blockText.replaceAll("\\s+", " ").trim();
            
            String prompt = blockText.replaceAll("\\$\\{ii\\(\\d+[^\\)]*\\)\\}", " [____] ").replaceAll("\\s+", " ").trim();

            if (prompt.isEmpty() || prompt.length() < 3) {
                prompt = "[____]";
            }

            appendJsQuestion(doc, sec, qNum, prompt, "FILL_BLANK", akMap.get(qNum), Collections.emptyList());
        }
    }

    private void appendJsQuestion(Document doc, Element sec, int qNum, String promptText, String type, String correctAns, List<String> defaultOpts) {
        String qId = "q_" + qNum;
        if (sec.selectFirst("[data-id='" + qId + "']") != null) {
            return;
        }

        Element q = doc.createElement("lmshub-question");
        q.attr("data-id", qId);
        q.attr("data-order", String.valueOf(qNum));
        q.attr("data-type", type.toLowerCase());

        Element p = doc.createElement("lmshub-text");
        p.text(promptText);
        q.appendChild(p);

        boolean isExactAnswer = "FILL_BLANK".equalsIgnoreCase(type)
                || "TRUE_FALSE_NG".equalsIgnoreCase(type)
                || "YES_NO_NG".equalsIgnoreCase(type);

        if (isExactAnswer) {
            if ("FILL_BLANK".equalsIgnoreCase(type)) {
                String answerStr = correctAns != null ? correctAns.trim() : "";
                int commaCount = answerStr.contains(",") ? answerStr.split(",").length : 0;
                int placeholderCount = countBlankPlaceholders(promptText);
                int numBlanks = Math.max(1, Math.max(commaCount, placeholderCount));

                if (numBlanks > 1) {
                    String[] parts = answerStr.split(",");
                    for (int b = 1; b <= numBlanks; b++) {
                        Element ansTag = doc.createElement("lmshub-answer");
                        ansTag.attr("data-blank", String.valueOf(b));
                        String bAns = "";
                        if (b - 1 < parts.length) {
                            bAns = parts[b - 1].trim();
                        } else if (parts.length > 0) {
                            bAns = parts[0].trim();
                        }
                        if (bAns.isEmpty()) {
                            bAns = "TBD";
                        }
                        ansTag.text(bAns);
                        q.appendChild(ansTag);
                    }
                } else {
                    Element ansTag = doc.createElement("lmshub-answer");
                    if (answerStr.isEmpty()) {
                        answerStr = "TBD";
                    }
                    ansTag.text(answerStr);
                    q.appendChild(ansTag);
                }
            } else {
                Element ansTag = doc.createElement("lmshub-answer");
                String answerStr = correctAns != null ? correctAns.trim() : "";
                if (answerStr.isEmpty()) {
                    answerStr = "TBD";
                }
                ansTag.text(answerStr);
                q.appendChild(ansTag);
            }
        }

        if (!"FILL_BLANK".equalsIgnoreCase(type)) {
            Element opts = doc.createElement("lmshub-options");
            String upperAns = correctAns != null ? correctAns.toUpperCase().trim() : "";
            for (String optText : defaultOpts) {
                Element o = doc.createElement("lmshub-option");
                o.attr("data-label", optText);
                o.attr("data-correct", String.valueOf(optText.equalsIgnoreCase(upperAns)));
                o.text(optText);
                opts.appendChild(o);
            }
            q.appendChild(opts);
        }

        sec.appendChild(q);
    }

    private boolean elementContains(Element parent, Element child) {
        Element p = child.parent();
        while (p != null) {
            if (p == parent) {
                return true;
            }
            p = p.parent();
        }
        return false;
    }

    private int countBlankPlaceholders(String text) {
        if (text == null) return 0;
        int count = 0;
        Pattern pattern = Pattern.compile("\\[_+\\]|_{3,}");
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            count++;
        }
        return count;
    }
}
