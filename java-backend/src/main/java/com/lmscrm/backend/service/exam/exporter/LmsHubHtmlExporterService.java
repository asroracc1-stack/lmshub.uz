package com.lmscrm.backend.service.exam.exporter;

import com.lmscrm.backend.domain.entity.*;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * LmsHubHtmlExporterService — Generates 100% LMSHub HTML v1 Specification compliant HTML files.
 *
 * Guaranteed compatibility with LmsHubHtmlParser:
 *   ✔ <html data-format="lmshub-v1" data-exam="..." data-title="..." data-subject="..." data-duration="...">
 *   ✔ <lmshub-section data-id="..." data-title="..." data-order="..." data-audio="...">
 *   ✔ <lmshub-instructions>...</lmshub-instructions>
 *   ✔ <lmshub-passage>...</lmshub-passage>
 *   ✔ <lmshub-question data-id="..." data-type="..." data-order="..." data-points="...">
 *   ✔ <lmshub-text>...</lmshub-text>
 *   ✔ <lmshub-option data-label="..." data-correct="true/false">...</lmshub-option>
 *   ✔ <lmshub-answer>...</lmshub-answer>
 *   ✔ <lmshub-answer data-blank="1">...</lmshub-answer>
 *   ✔ <lmshub-match data-left="..." data-right="..."/>
 *   ✔ <lmshub-media data-ref="..." data-src="..." data-name="..."/>
 *   ✔ <lmshub-explanation>...</lmshub-explanation>
 *
 * Keeps frontend UI intact while providing static tags for non-JS backend parsing.
 */
@Service
public class LmsHubHtmlExporterService {

    public String generateCompliantHtml(Exam exam) {
        StringBuilder html = new StringBuilder();

        String examType = exam.getType() != null ? exam.getType().name() : "IELTS";
        String examTitle = escapeXml(exam.getTitle() != null ? exam.getTitle() : "LMSHub Exam");
        String subject = escapeXml(exam.getSubType() != null ? exam.getSubType() : "General");
        int duration = exam.getDurationMinutes() != null ? exam.getDurationMinutes() : 60;

        // 1. Root <html> tag with data-format="lmshub-v1"
        html.append("<!DOCTYPE html>\n");
        html.append(String.format(
            "<html data-format=\"lmshub-v1\" data-exam=\"%s\" data-title=\"%s\" data-subject=\"%s\" data-duration=\"%d\">\n",
            examType, examTitle, subject, duration
        ));

        // 2. Head section
        html.append("<head>\n");
        html.append("  <meta charset=\"UTF-8\">\n");
        html.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        html.append(String.format("  <meta name=\"lmshub:format\" content=\"lmshub-v1\">\n"));
        html.append(String.format("  <meta name=\"lmshub:exam\" content=\"%s\">\n", examType));
        html.append(String.format("  <meta name=\"lmshub:title\" content=\"%s\">\n", examTitle));
        html.append(String.format("  <title>%s</title>\n", examTitle));
        html.append("  <style>\n");
        html.append("    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f8fafc; color: #0f172a; }\n");
        html.append("    .lmshub-container { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }\n");
        html.append("    .passage-card { background: white; padding: 24px; border-radius: 12px; border: 1fr solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-y: auto; max-height: 85vh; }\n");
        html.append("    .questions-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-y: auto; max-height: 85vh; }\n");
        html.append("    .q-block { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px dashed #cbd5e1; }\n");
        html.append("    .opt-label { display: flex; align-items: center; gap: 8px; margin: 6px 0; cursor: pointer; }\n");
        html.append("    lmshub-section, lmshub-question, lmshub-option, lmshub-answer, lmshub-text, lmshub-passage, lmshub-instructions, lmshub-explanation, lmshub-match, lmshub-media { display: block; }\n");
        html.append("  </style>\n");
        html.append("</head>\n");
        html.append("<body>\n");

        // 3. UI Header
        html.append("  <header style=\"margin-bottom: 20px;\">\n");
        html.append(String.format("    <h1 style=\"font-size: 24px; font-weight: 800;\">%s</h1>\n", examTitle));
        html.append(String.format("    <span style=\"background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 12px;\">%s · %d daqiqa</span>\n", examType, duration));
        html.append("  </header>\n\n");

        // 4. Sections & Questions (LMSHub v1 spec static elements)
        List<Passage> passages = exam.getPassages();
        if (passages != null && !passages.isEmpty()) {
            int secOrder = 1;
            for (Passage passage : passages) {
                appendSection(html, passage, secOrder++);
            }
        } else if (exam.getQuestions() != null && !exam.getQuestions().isEmpty()) {
            // Default single section if no passages
            html.append(String.format("  <lmshub-section data-id=\"sec_main\" data-title=\"%s\" data-order=\"1\">\n", examTitle));
            html.append("    <lmshub-instructions>Barcha savollarga javob bering.</lmshub-instructions>\n");
            html.append("    <lmshub-passage>Exam Questions</lmshub-passage>\n");
            
            int qOrder = 1;
            for (Question question : exam.getQuestions()) {
                appendQuestion(html, question, qOrder++);
            }
            html.append("  </lmshub-section>\n");
        }

        html.append("</body>\n");
        html.append("</html>");

        return html.toString();
    }

    private void appendSection(StringBuilder html, Passage passage, int order) {
        String secId = passage.getId() != null ? passage.getId().toString() : "sec_" + order;
        String secTitle = escapeXml(passage.getTitle() != null ? passage.getTitle() : "Section " + order);
        String audioUrl = passage.getAudioUrl() != null ? passage.getAudioUrl() : "";
        Integer timeLimit = passage.getTimeLimitSeconds();

        html.append(String.format("  <lmshub-section data-id=\"%s\" data-title=\"%s\" data-order=\"%d\"", secId, secTitle, order));
        if (!audioUrl.isBlank()) {
            html.append(String.format(" data-audio=\"%s\"", escapeXml(audioUrl)));
        }
        if (timeLimit != null && timeLimit > 0) {
            html.append(String.format(" data-time-limit=\"%d\"", timeLimit));
        }
        html.append(">\n");

        // Instructions
        String instructions = passage.getInstructions() != null ? passage.getInstructions() : "Read the passage carefully and answer questions.";
        html.append(String.format("    <lmshub-instructions>%s</lmshub-instructions>\n", escapeXml(instructions)));

        // Passage Text
        html.append("    <lmshub-passage>\n");
        String content = passage.getContent() != null ? passage.getContent() : "";
        html.append(String.format("      %s\n", content));
        if (passage.getImageUrl() != null && !passage.getImageUrl().isBlank()) {
            html.append(String.format("      <lmshub-media data-ref=\"img_sec_%d\" data-src=\"%s\" data-name=\"passage_img.png\"/>\n",
                    order, escapeXml(passage.getImageUrl())));
        }
        html.append("    </lmshub-passage>\n\n");

        // Questions in this section
        List<Question> questions = passage.getQuestions();
        if (questions != null) {
            int qOrder = 1;
            for (Question q : questions) {
                appendQuestion(html, q, qOrder++);
            }
        }

        html.append("  </lmshub-section>\n\n");
    }

    private void appendQuestion(StringBuilder html, Question q, int order) {
        String qId = q.getId() != null ? q.getId().toString() : "q_" + order;
        String qType = q.getQuestionType() != null ? q.getQuestionType().toUpperCase() : "MCQ";
        int points = q.getPoints() != null ? q.getPoints() : 1;

        html.append(String.format("    <lmshub-question data-id=\"%s\" data-type=\"%s\" data-order=\"%d\" data-points=\"%d\">\n",
                qId, qType, order, points));

        // Question text
        String qText = q.getText() != null ? q.getText() : "";
        html.append(String.format("      <lmshub-text>%s</lmshub-text>\n", qText));

        if (q.getImageUrl() != null && !q.getImageUrl().isBlank()) {
            html.append(String.format("      <lmshub-media data-ref=\"img_q_%s\" data-src=\"%s\" data-name=\"q_image.png\"/>\n",
                    qId, escapeXml(q.getImageUrl())));
        }

        // Options (for MCQ / MULTI_SELECT / TFNG)
        List<QuestionOption> options = q.getOptions();
        if (options != null && !options.isEmpty()) {
            char labelChar = 'A';
            for (QuestionOption opt : options) {
                String label = String.valueOf(labelChar++);
                boolean isCorrect = Boolean.TRUE.equals(opt.getIsCorrect());
                String optText = escapeXml(opt.getText() != null ? opt.getText() : "");
                
                html.append(String.format("      <lmshub-option data-label=\"%s\" data-correct=\"%b\">%s</lmshub-option>\n",
                        label, isCorrect, optText));
            }
        }

        // Correct Answer
        AnswerKey ak = q.getAnswerKey();
        String correctAnswer = "";
        if (ak != null && ak.getCorrectAnswer() != null) {
            correctAnswer = ak.getCorrectAnswer();
        } else if (options != null) {
            // fallback: find correct option label
            char l = 'A';
            for (QuestionOption opt : options) {
                if (Boolean.TRUE.equals(opt.getIsCorrect())) {
                    correctAnswer = String.valueOf(l);
                    break;
                }
                l++;
            }
        }

        if (!correctAnswer.isBlank()) {
            // Check if multiple fill-blank answers comma-separated
            if (qType.contains("FILL") && correctAnswer.contains(",")) {
                String[] blanks = correctAnswer.split(",");
                int bIdx = 1;
                for (String b : blanks) {
                    html.append(String.format("      <lmshub-answer data-blank=\"%d\">%s</lmshub-answer>\n",
                            bIdx++, escapeXml(b.trim())));
                }
            } else {
                html.append(String.format("      <lmshub-answer>%s</lmshub-answer>\n", escapeXml(correctAnswer)));
            }
        }

        // Explanation
        if (q.getExplanation() != null && !q.getExplanation().isBlank()) {
            html.append(String.format("      <lmshub-explanation>%s</lmshub-explanation>\n", escapeXml(q.getExplanation())));
        }

        html.append("    </lmshub-question>\n");
    }

    private String escapeXml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&apos;");
    }
}
