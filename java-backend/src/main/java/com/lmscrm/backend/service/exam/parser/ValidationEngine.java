package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;
import com.lmscrm.backend.dto.exam.parser.ValidationReport;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ValidationEngine {

    public ValidationReport validate(ParseResult parseResult) {
        ValidationReport report = new ValidationReport();
        report.setParseResult(parseResult);
        
        Set<String> seenTexts = new HashSet<>();

        List<ParseResult.ParsedQuestion> questions = parseResult.getQuestions();
        if (questions.isEmpty()) {
            report.getErrors().add(new ValidationReport.ValidationError("EmptyExamRule", null, "No questions were found in the HTML."));
            report.setValid(false);
            return report;
        }

        for (ParseResult.ParsedQuestion q : questions) {
            
            // Rule: Empty Question
            if (q.getRawText() == null || q.getRawText().trim().isEmpty()) {
                report.getErrors().add(new ValidationReport.ValidationError("EmptyQuestionRule", q.getOriginalId(), "Question prompt is empty."));
            }

            // Rule: Duplicate Question Text
            if (q.getRawText() != null && !seenTexts.add(q.getRawText().trim().toLowerCase())) {
                report.getWarnings().add(new ValidationReport.ValidationWarning("DuplicateQuestionRule", q.getOriginalId(), "Question text is identical to a previous question."));
            }

            if ("SINGLE_CHOICE".equalsIgnoreCase(q.getQuestionType()) || "MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionType())) {
                // Rule: Missing Options
                if (q.getOptions().size() < 2) {
                    report.getErrors().add(new ValidationReport.ValidationError("MissingOptionsRule", q.getOriginalId(), "MCQ must have at least 2 options. Found: " + q.getOptions().size()));
                }

                boolean hasEmptyOption = false;
                long correctCount = 0;
                Set<String> optionTexts = new HashSet<>();

                for (ParseResult.ParsedOption opt : q.getOptions()) {
                    if (opt.getText() == null || opt.getText().trim().isEmpty()) {
                        hasEmptyOption = true;
                    }
                    if (opt.isCorrect()) {
                        correctCount++;
                    }
                    if (opt.getText() != null && !optionTexts.add(opt.getText().trim().toLowerCase())) {
                        report.getErrors().add(new ValidationReport.ValidationError("DuplicateOptionRule", q.getOriginalId(), "Duplicate option text found: " + opt.getText()));
                    }
                }

                // Rule: Empty Option
                if (hasEmptyOption) {
                    report.getErrors().add(new ValidationReport.ValidationError("EmptyOptionRule", q.getOriginalId(), "One or more options are empty."));
                }

                // Rule: Missing Answer Key
                if (correctCount == 0) {
                    report.getErrors().add(new ValidationReport.ValidationError("MissingAnswerKeyRule", q.getOriginalId(), "No correct answer specified for this question."));
                }

                // Rule: Multiple Correct Answers for Single Choice
                if ("SINGLE_CHOICE".equalsIgnoreCase(q.getQuestionType()) && correctCount > 1) {
                    report.getErrors().add(new ValidationReport.ValidationError("MultipleCorrectAnswersRule", q.getOriginalId(), "SINGLE_CHOICE question has multiple correct answers."));
                }
            } else {
                // For FillBlank, ShortAnswer, Math, etc.
                if (q.getCorrectAnswer() == null || q.getCorrectAnswer().trim().isEmpty()) {
                    report.getErrors().add(new ValidationReport.ValidationError("MissingExactAnswerRule", q.getOriginalId(), "Question type " + q.getQuestionType() + " requires an exact answer key."));
                }
            }

            // Rule: Broken Media Reference
            for (String ref : q.getMediaRefs()) {
                boolean found = parseResult.getMediaAssets().stream().anyMatch(m -> ref.equals(m.getRefId()));
                if (!found) {
                    report.getErrors().add(new ValidationReport.ValidationError("BrokenImageRule", q.getOriginalId(), "Media asset reference '" + ref + "' not found in extracted assets."));
                }
            }
        }

        report.setValid(report.getErrors().isEmpty());
        return report;
    }
}
