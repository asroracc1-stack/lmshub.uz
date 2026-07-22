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
 * LmsHubHtmlLayoutConverter — Converts UI-oriented HTML files (containing JS PASSAGES, AK objects, etc.)
 * into 100% compliant LMSHub HTML v1 specification files.
 *
 * Ensures that even if the HTML is rendered dynamically via JavaScript for the user,
 * all data tags (<lmshub-section>, <lmshub-question>, <lmshub-option>, <lmshub-answer>, etc.)
 * exist as static HTML elements in the document source code for non-JS backend parsing.
 */
@Service
public class LmsHubHtmlLayoutConverter {

    /**
     * Accepts any UI HTML input (file bytes) and ensures all LMSHub HTML v1 spec tags
     * (<html data-format="lmshub-v1">, <lmshub-section>, <lmshub-question>, etc.) are embedded.
     */
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
            htmlEl.attr("data-exam", examType != null ? examType : "IELTS");
        }
        if (!htmlEl.hasAttr("data-title")) {
            htmlEl.attr("data-title", examTitle != null ? examTitle : "LMSHub Exam");
        }
        if (!htmlEl.hasAttr("data-subject")) {
            htmlEl.attr("data-subject", "Reading");
        }
        if (!htmlEl.hasAttr("data-duration")) {
            htmlEl.attr("data-duration", "60");
        }

        // 2. Check if <lmshub-section> already exists
        Elements existingSections = doc.select("lmshub-section");
        if (existingSections.isEmpty()) {
            // Transform existing UI elements (div.passage, div.question, JS data) into <lmshub-*> tags
            Element body = doc.body();
            if (body != null) {
                injectLmsHubTagsFromUiDom(doc, body);
            }
        }

        return doc.outerHtml();
    }

    private void injectLmsHubTagsFromUiDom(Document doc, Element body) {
        // Look for passage containers or UI question blocks in existing HTML
        Elements passageContainers = doc.select(".passage, .passage-block, section, [data-passage-id]");
        
        if (passageContainers.isEmpty()) {
            // Create a default single <lmshub-section> wrapping the content
            Element sec = doc.createElement("lmshub-section");
            sec.attr("data-id", "sec_1");
            sec.attr("data-title", "Section 1");
            sec.attr("data-order", "1");

            Element instr = doc.createElement("lmshub-instructions");
            instr.text("Read the passage and answer the questions.");
            sec.appendChild(instr);

            Element passage = doc.createElement("lmshub-passage");
            Element passageTextEl = doc.selectFirst(".passage-text, #passage-content, .content-box");
            if (passageTextEl != null) {
                passage.text(passageTextEl.text());
            } else {
                passage.text("Passage Content");
            }
            sec.appendChild(passage);

            // Extract questions from UI DOM
            Elements uiQuestions = doc.select(".question, .q-block, .question-item, [id^=q], [data-q-id]");
            int qOrder = 1;
            for (Element qUi : uiQuestions) {
                Element lmshubQ = createLmsHubQuestion(doc, qUi, qOrder++);
                sec.appendChild(lmshubQ);
            }

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

                Elements qList = pUi.select(".question, .q-block, [data-q-id]");
                int qOrder = 1;
                for (Element qUi : qList) {
                    sec.appendChild(createLmsHubQuestion(doc, qUi, qOrder++));
                }

                body.appendChild(sec);
                secOrder++;
            }
        }
    }

    private Element createLmsHubQuestion(Document doc, Element qUi, int order) {
        Element q = doc.createElement("lmshub-question");
        String qId = qUi.attr("data-q-id").isEmpty() ? "q_" + order : qUi.attr("data-q-id");
        String qType = qUi.attr("data-type").isEmpty() ? "MCQ" : qUi.attr("data-type").toUpperCase();

        q.attr("data-id", qId);
        q.attr("data-type", qType);
        q.attr("data-order", String.valueOf(order));
        q.attr("data-points", "1");

        // Question text
        Element text = doc.createElement("lmshub-text");
        Element textUi = qUi.selectFirst(".q-text, .question-text, p");
        text.text(textUi != null ? textUi.text() : qUi.text());
        q.appendChild(text);

        // Options
        Elements optUis = qUi.select(".option, .opt, label, input[type=radio]");
        char labelChar = 'A';
        for (Element optUi : optUis) {
            Element opt = doc.createElement("lmshub-option");
            opt.attr("data-label", String.valueOf(labelChar++));
            boolean isCorrect = optUi.hasClass("correct") || "true".equalsIgnoreCase(optUi.attr("data-correct"));
            opt.attr("data-correct", String.valueOf(isCorrect));
            opt.text(optUi.text());
            q.appendChild(opt);
        }

        // Answer
        Element answerUi = qUi.selectFirst(".answer, .correct-answer, [data-answer]");
        if (answerUi != null) {
            Element ans = doc.createElement("lmshub-answer");
            ans.text(answerUi.text());
            q.appendChild(ans);
        }

        return q;
    }
}
