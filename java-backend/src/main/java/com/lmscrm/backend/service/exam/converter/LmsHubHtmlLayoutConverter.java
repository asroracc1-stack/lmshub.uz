package com.lmscrm.backend.service.exam.converter;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * LmsHubHtmlLayoutConverter — Converts legacy/UI-oriented HTML files into 100% compliant
 * LMSHub HTML v1 specification files with static <lmshub-section> and <lmshub-question> tags.
 */
@Service
public class LmsHubHtmlLayoutConverter {

    public String convertToLmsHubSpecification(byte[] htmlBytes, String examTitle, String examType) {
        String rawHtml = new String(htmlBytes, StandardCharsets.UTF_8);
        Document doc = Jsoup.parse(rawHtml);

        // 1. Ensure <html> element has required data attributes
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

        // 2. If <lmshub-section> already exists, return unchanged
        Elements existingSections = doc.select("lmshub-section");
        if (!existingSections.isEmpty()) {
            return doc.outerHtml();
        }

        // 3. Inject static <lmshub-section> tags from HTML DOM or JS scripts
        Element body = doc.body();
        if (body == null) {
            body = doc.appendElement("body");
        }

        injectLmsHubTags(doc, body, rawHtml);

        return doc.outerHtml();
    }

    private void injectLmsHubTags(Document doc, Element body, String rawHtml) {
        Elements passageContainers = doc.select(".passage, .passage-block, section, article, [data-passage-id], .reading-text, #passage-content");

        if (passageContainers.isEmpty()) {
            // Create default section 1
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
                passage.text("Passage content");
            }
            sec.appendChild(passage);

            // Extract questions from UI DOM or JS regex
            extractAndAppendQuestions(doc, sec, rawHtml);

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

                extractAndAppendQuestions(doc, sec, rawHtml);

                body.appendChild(sec);
                secOrder++;
            }
        }
    }

    private void extractAndAppendQuestions(Document doc, Element section, String rawHtml) {
        // 1. First attempt: extract from HTML DOM question elements
        Elements uiQuestions = doc.select(".question, .q-block, .question-item, [id^=q], [data-q-id], .q-item");
        int qOrder = 1;

        if (!uiQuestions.isEmpty()) {
            for (Element qUi : uiQuestions) {
                String uiText = qUi.text().trim();
                if (!uiText.isBlank() && (qUi.selectFirst("input, label, select, .options") != null || qUi.hasAttr("data-q-id") || qUi.id().startsWith("q"))) {
                    section.appendChild(createLmsHubQuestion(doc, qUi, qOrder++));
                }
            }
        }

        // 2. Fallback: if no DOM questions found, parse JS AK object / PASSAGES via regex
        if (qOrder == 1) {
            // Regex for AK answer key: "q1": "TRUE", "q2": "FALSE" or "1": "education"
            Pattern akPattern = Pattern.compile("\"?(q?\\d+)\"?\\s*:\\s*\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
            Matcher matcher = akPattern.matcher(rawHtml);
            
            while (matcher.find()) {
                String qId = matcher.group(1);
                String ansText = matcher.group(2).trim();

                Element q = doc.createElement("lmshub-question");
                q.attr("data-id", qId.startsWith("q") ? qId : "q_" + qId);
                q.attr("data-order", String.valueOf(qOrder));
                q.attr("data-points", "1");

                Element text = doc.createElement("lmshub-text");
                text.text("Question " + qOrder);
                q.appendChild(text);

                String upperAns = ansText.toUpperCase();
                if (upperAns.equals("TRUE") || upperAns.equals("FALSE") || upperAns.equals("NOT GIVEN")) {
                    q.attr("data-type", "TRUE_FALSE_NG");
                    Element optT = doc.createElement("lmshub-option");
                    optT.attr("data-label", "TRUE");
                    optT.attr("data-correct", String.valueOf(upperAns.equals("TRUE")));
                    optT.text("TRUE");
                    q.appendChild(optT);

                    Element optF = doc.createElement("lmshub-option");
                    optF.attr("data-label", "FALSE");
                    optF.attr("data-correct", String.valueOf(upperAns.equals("FALSE")));
                    optF.text("FALSE");
                    q.appendChild(optF);

                    Element optNg = doc.createElement("lmshub-option");
                    optNg.attr("data-label", "NOT GIVEN");
                    optNg.attr("data-correct", String.valueOf(upperAns.equals("NOT GIVEN")));
                    optNg.text("NOT GIVEN");
                    q.appendChild(optNg);
                } else {
                    // Default to FILL_BLANK for non-MCQ answers (no option rules enforced)
                    q.attr("data-type", "FILL_BLANK");
                }

                Element ans = doc.createElement("lmshub-answer");
                ans.text(ansText);
                q.appendChild(ans);

                section.appendChild(q);
                qOrder++;
            }
        }

        // 3. Fallback 2: if still no questions found at all, create 1 valid FILL_BLANK question
        if (qOrder == 1) {
            Element q = doc.createElement("lmshub-question");
            q.attr("data-id", "q_1");
            q.attr("data-type", "FILL_BLANK");
            q.attr("data-order", "1");
            q.attr("data-points", "1");

            Element text = doc.createElement("lmshub-text");
            text.text("Question 1");
            q.appendChild(text);

            Element ans = doc.createElement("lmshub-answer");
            ans.text("Answer 1");
            q.appendChild(ans);

            section.appendChild(q);
        }
    }

    private Element createLmsHubQuestion(Document doc, Element qUi, int order) {
        Element q = doc.createElement("lmshub-question");
        String qId = qUi.attr("data-q-id").isEmpty() ? (qUi.id().isEmpty() ? "q_" + order : qUi.id()) : qUi.attr("data-q-id");
        
        q.attr("data-id", qId);
        q.attr("data-order", String.valueOf(order));
        q.attr("data-points", "1");

        // Question text (guaranteed non-empty)
        Element text = doc.createElement("lmshub-text");
        Element textUi = qUi.selectFirst(".q-text, .question-text, p, label");
        String textVal = "";
        if (textUi != null && !textUi.text().isBlank()) {
            textVal = textUi.text().trim();
        } else if (!qUi.text().isBlank()) {
            textVal = qUi.text().trim();
        } else {
            textVal = "Question " + order;
        }
        text.text(textVal);
        q.appendChild(text);

        // Options
        Elements optUis = qUi.select(".option, .opt, label, input[type=radio]");
        char labelChar = 'A';
        for (Element optUi : optUis) {
            if (optUi.text().isBlank()) continue;
            Element opt = doc.createElement("lmshub-option");
            opt.attr("data-label", String.valueOf(labelChar++));
            boolean isCorrect = optUi.hasClass("correct") || "true".equalsIgnoreCase(optUi.attr("data-correct"));
            opt.attr("data-correct", String.valueOf(isCorrect));
            opt.text(optUi.text().trim());
            q.appendChild(opt);
        }

        int optionCount = q.select("lmshub-option").size();
        String declaredType = qUi.attr("data-type").toUpperCase();

        if (!declaredType.isBlank()) {
            q.attr("data-type", declaredType);
            if ((declaredType.equals("SINGLE_CHOICE") || declaredType.equals("MULTIPLE_CHOICE")) && optionCount < 2) {
                // Add default options A and B if MCQ has fewer than 2 options
                Element optA = doc.createElement("lmshub-option");
                optA.attr("data-label", "A");
                optA.attr("data-correct", "true");
                optA.text("Option A");
                q.appendChild(optA);

                Element optB = doc.createElement("lmshub-option");
                optB.attr("data-label", "B");
                optB.attr("data-correct", "false");
                optB.text("Option B");
                q.appendChild(optB);
            }
        } else {
            // Determine type based on options present
            if (optionCount >= 2) {
                q.attr("data-type", "SINGLE_CHOICE");
            } else {
                q.attr("data-type", "FILL_BLANK");
            }
        }

        // Answer
        Element answerUi = qUi.selectFirst(".answer, .correct-answer, [data-answer]");
        Element ans = doc.createElement("lmshub-answer");
        if (answerUi != null && !answerUi.text().isBlank()) {
            ans.text(answerUi.text().trim());
        } else {
            ans.text("A");
        }
        q.appendChild(ans);

        return q;
    }
}
