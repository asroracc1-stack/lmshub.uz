package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Deterministic HTML Parser for LMSHub HTML v1 Specification.
 * Never uses AI. Strictly relies on predefined DOM classes and data-attributes.
 */
@Component
public class LmsHtmlParser implements ExamParser {

    @Override
    public ParseResult parse(byte[] fileBytes, String fileName) throws Exception {
        ParseResult result = new ParseResult();
        String htmlContent = new String(fileBytes, StandardCharsets.UTF_8);
        Document doc = Jsoup.parse(htmlContent);

        // Standard Structure: <div class="lmshub-section"> -> <div class="lmshub-question">
        Elements sectionBlocks = doc.select(".lmshub-section");
        
        if (sectionBlocks.isEmpty()) {
            // Treat the whole document as one default section
            parseQuestionsFromElement(doc, result);
        } else {
            for (Element section : sectionBlocks) {
                // Section-level metadata could be extracted here
                parseQuestionsFromElement(section, result);
            }
        }

        return result;
    }

    private void parseQuestionsFromElement(Element container, ParseResult result) {
        Elements questionBlocks = container.select(".lmshub-question");

        for (Element block : questionBlocks) {
            ParseResult.ParsedQuestion pq = new ParseResult.ParsedQuestion();
            pq.setOriginalId(block.attr("data-id").isEmpty() ? UUID.randomUUID().toString() : block.attr("data-id"));
            pq.setQuestionType(block.attr("data-type").isEmpty() ? "SINGLE_CHOICE" : block.attr("data-type"));
            
            // Extract Prompt
            Element promptEl = block.selectFirst(".question-text");
            if (promptEl != null) {
                extractMediaAssets(promptEl, pq, result);
                pq.setRawText(promptEl.html()); // Preserve HTML tags like <b>, <i>, <table>, mathjax
            }

            // Extract Options
            Elements optionsList = block.select(".question-option");
            for (Element optEl : optionsList) {
                ParseResult.ParsedOption po = new ParseResult.ParsedOption();
                po.setLabel(optEl.attr("data-label"));
                
                extractMediaAssets(optEl, pq, result);
                po.setText(optEl.html());
                
                po.setCorrect("true".equalsIgnoreCase(optEl.attr("data-correct")));
                pq.getOptions().add(po);
            }

            // Extract Explicit Answer Key (for FillBlank, Math, ShortAnswer)
            Element exactAnswerEl = block.selectFirst(".exact-answer");
            if (exactAnswerEl != null) {
                pq.setCorrectAnswer(exactAnswerEl.text());
            }

            // Extract Explanation
            Element expEl = block.selectFirst(".explanation");
            if (expEl != null) {
                extractMediaAssets(expEl, pq, result);
                pq.setExplanation(expEl.html());
            }

            result.getQuestions().add(pq);
        }
    }

    private void extractMediaAssets(Element sourceElement, ParseResult.ParsedQuestion pq, ParseResult result) {
        Elements imgs = sourceElement.select("img");
        for (Element img : imgs) {
            String src = img.attr("src");
            String refId = "media_" + UUID.randomUUID().toString().substring(0, 8);
            
            ParseResult.MediaAsset asset = new ParseResult.MediaAsset();
            asset.setRefId(refId);
            asset.setRawSvg(src); // To be processed by MediaProcessor later (AWS S3)
            
            result.getMediaAssets().add(asset);
            pq.getMediaRefs().add(refId);
            
            // Replace the actual src with our internal reference tag
            img.attr("src", "[MEDIA_REF:" + refId + "]");
        }
    }
}
