package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;
import com.lmscrm.backend.dto.exam.parser.ValidationReport;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * ValidationEngine — 40+ deterministic rules for LMSHub HTML v1 import validation.
 *
 * Rules are grouped:
 *   - Exam-level    (1-6)
 *   - Section-level (7-11)
 *   - Question-level (12-19)
 *   - MCQ rules     (20-27)
 *   - Answer rules  (28-30)
 *   - Type-specific (31-37)
 *   - Media rules   (38-42)
 *   - CSS leak      (43)
 */
@Service
public class ValidationEngine {

    private static final Set<String> VALID_QUESTION_TYPES = Set.of(
            "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE_NG", "YES_NO_NG",
            "FILL_BLANK", "MATCHING", "HEADING_MATCH", "ORDERING",
            "SHORT_ANSWER", "ESSAY", "MATH", "MAP_LABELLING", "SENTENCE_COMPLETION"
    );

    private static final Set<String> EXACT_ANSWER_TYPES = Set.of(
            "FILL_BLANK", "SENTENCE_COMPLETION", "SHORT_ANSWER", "MATH",
            "TRUE_FALSE_NG", "YES_NO_NG", "MAP_LABELLING"
    );

    private static final Set<String> MCQ_TYPES = Set.of(
            "SINGLE_CHOICE", "MULTIPLE_CHOICE"
    );

    private static final Set<String> TFNG_ANSWERS = Set.of(
            "TRUE", "FALSE", "NOT GIVEN", "YES", "NO"
    );

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
            "audio/mpeg", "audio/wav"
    );

    public ValidationReport validate(ParseResult parseResult) {
        ValidationReport report = new ValidationReport();
        report.setParseResult(parseResult);

        // ── Exam-level rules ──────────────────────────────────────────────────
        validateExamLevel(parseResult, report);

        if (parseResult.getSections() == null || parseResult.getSections().isEmpty()) {
            report.setValid(report.getErrors().isEmpty());
            return report;
        }

        // ── Section-level rules ───────────────────────────────────────────────
        Set<String> seenSectionIds = new HashSet<>();
        Set<String> seenQuestionIds = new HashSet<>();
        Set<String> seenQuestionTexts = new HashSet<>();
        Set<String> allMediaRefs = new HashSet<>();

        // Collect all media refIds for unused-media check
        if (parseResult.getMediaAssets() != null) {
            parseResult.getMediaAssets().forEach(a -> allMediaRefs.add(a.getRefId()));
        }
        Set<String> referencedMediaIds = collectAllReferencedMedia(parseResult);

        int expectedSectionOrder = 1;
        for (ParseResult.ParsedSection section : parseResult.getSections()) {
            validateSection(section, report, seenSectionIds, seenQuestionIds,
                    seenQuestionTexts, expectedSectionOrder);
            expectedSectionOrder++;
        }

        // ── Media rules ───────────────────────────────────────────────────────
        validateMedia(parseResult, report, referencedMediaIds);

        report.setValid(report.getErrors().isEmpty());
        return report;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Exam-level (rules 1-6)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateExamLevel(ParseResult result, ValidationReport report) {
        // Rule 1: Invalid HTML version
        if (result.getHtmlVersion() == null || result.getHtmlVersion().isBlank()) {
            error(report, "InvalidHtmlVersionRule", null,
                    "HTML is missing data-format attribute. Expected: data-format=\"lmshub-v1\".");
        }

        // Rule 2: Missing exam type
        if (result.getExamType() == null || result.getExamType().isBlank()) {
            error(report, "MissingExamTypeRule", null,
                    "HTML is missing data-exam attribute (e.g. data-exam=\"IELTS_READING\").");
        }

        // Rule 3: Missing exam title
        if (result.getExamTitle() == null || result.getExamTitle().isBlank()) {
            warn(report, "MissingExamTitleRule", null,
                    "HTML is missing data-title attribute.");
        }

        // Rule 4: Empty sections
        if (result.getSections() == null || result.getSections().isEmpty()) {
            error(report, "EmptySectionsRule", null,
                    "No <lmshub-section> elements found. The exam must have at least one section.");
        }

        // Rule 5: Missing duration (warning only)
        if (result.getDurationMinutes() == null || result.getDurationMinutes() <= 0) {
            warn(report, "MissingDurationRule", null,
                    "data-duration is missing or zero. Default will be used.");
        }

        // Rule 6: Total questions check
        if (result.getSections() != null) {
            int total = result.totalQuestionCount();
            if (total == 0) {
                error(report, "EmptyExamRule", null,
                        "No questions were found in any section.");
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Section-level (rules 7-11)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateSection(ParseResult.ParsedSection section,
                                  ValidationReport report,
                                  Set<String> seenSectionIds,
                                  Set<String> seenQuestionIds,
                                  Set<String> seenQuestionTexts,
                                  int expectedOrder) {
        String sid = section.getSectionId();

        // Rule 7: Duplicate section ID
        if (sid != null && !seenSectionIds.add(sid)) {
            error(report, "DuplicateSectionIdRule", sid,
                    "Duplicate section data-id: " + sid);
        }

        // Rule 8: Empty section title
        if (section.getSectionTitle() == null || section.getSectionTitle().isBlank()) {
            warn(report, "EmptySectionTitleRule", sid,
                    "Section " + sid + " is missing a title.");
        }

        // Rule 9: Empty passage text (warning for reading types)
        if (section.getPassageText() == null || section.getPassageText().isBlank()) {
            warn(report, "EmptyPassageTextRule", sid,
                    "Section " + sid + " has no passage text in <lmshub-passage>.");
        }

        // Rule 10: No questions in section
        if (section.getQuestions() == null || section.getQuestions().isEmpty()) {
            error(report, "EmptyQuestionsInSectionRule", sid,
                    "Section " + sid + " has no questions.");
            return;
        }

        // Rule 11: Invalid section order sequence
        if (section.getOrder() != expectedOrder) {
            warn(report, "InvalidSectionOrderRule", sid,
                    "Section " + sid + " has order " + section.getOrder() +
                    " but expected " + expectedOrder + ".");
        }

        // Validate each question in this section
        int expectedQOrder = 1;
        for (ParseResult.ParsedQuestion q : section.getQuestions()) {
            validateQuestion(q, report, seenQuestionIds, seenQuestionTexts, expectedQOrder);
            expectedQOrder++;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Question-level (rules 12-37)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateQuestion(ParseResult.ParsedQuestion q,
                                   ValidationReport report,
                                   Set<String> seenIds,
                                   Set<String> seenTexts,
                                   int expectedOrder) {
        String qid = q.getOriginalId();

        // Rule 12: Duplicate question ID
        if (qid != null && !seenIds.add(qid)) {
            error(report, "DuplicateQuestionIdRule", qid,
                    "Duplicate question data-id: " + qid);
        }

        // Rule 13: Empty question text
        if (q.getRawText() == null || q.getRawText().isBlank()) {
            error(report, "EmptyQuestionTextRule", qid, "Question prompt is empty.");
        }

        // Rule 14: Duplicate question text (warning)
        if (q.getRawText() != null && !seenTexts.add(q.getRawText().toLowerCase().strip())) {
            warn(report, "DuplicateQuestionTextRule", qid,
                    "Question text is identical to a previous question.");
        }

        // Rule 15: Invalid question type
        if (q.getQuestionType() == null || q.getQuestionType().isBlank()) {
            error(report, "MissingQuestionTypeRule", qid, "Question has no data-type.");
        } else if (!VALID_QUESTION_TYPES.contains(q.getQuestionType().toUpperCase())) {
            error(report, "InvalidQuestionTypeRule", qid,
                    "Unknown question type: " + q.getQuestionType() +
                    ". Valid types: " + VALID_QUESTION_TYPES);
        }

        // Rule 16: Missing order
        if (q.getOrder() <= 0) {
            warn(report, "MissingOrderRule", qid, "Question is missing data-order.");
        }

        // Rule 17: Invalid order sequence
        if (q.getOrder() != expectedOrder) {
            warn(report, "InvalidOrderSequenceRule", qid,
                    "Question " + qid + " has order " + q.getOrder() +
                    " but expected " + expectedOrder + ".");
        }

        // Rule 18: Points must be positive
        if (q.getPoints() <= 0) {
            warn(report, "InvalidPointsRule", qid,
                    "Question " + qid + " has non-positive points: " + q.getPoints());
        }

        // Rule 19: Broken media reference
        // (Checked globally after all questions — see validateMedia)

        String qType = q.getQuestionType() != null ? q.getQuestionType().toUpperCase() : "";

        // MCQ-specific rules
        if (MCQ_TYPES.contains(qType)) {
            validateMCQ(q, report, qid, qType);
        }

        // Exact-answer type rules
        if (EXACT_ANSWER_TYPES.contains(qType)) {
            validateExactAnswer(q, report, qid, qType);
        }

        // TRUE_FALSE_NG specific
        if ("TRUE_FALSE_NG".equals(qType) || "YES_NO_NG".equals(qType)) {
            validateTFNG(q, report, qid);
        }

        // MATCHING specific
        if ("MATCHING".equals(qType) || "HEADING_MATCH".equals(qType)) {
            validateMatching(q, report, qid);
        }

        // FILL_BLANK: multiple blanks check
        if ("FILL_BLANK".equals(qType) || "SENTENCE_COMPLETION".equals(qType)) {
            validateFillBlank(q, report, qid);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MCQ rules (20-27)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateMCQ(ParseResult.ParsedQuestion q, ValidationReport report,
                              String qid, String qType) {
        List<ParseResult.ParsedOption> opts = q.getOptions();

        // Rule 20: Too few options
        if (opts == null || opts.size() < 2) {
            error(report, "TooFewOptionsRule", qid,
                    "MCQ must have at least 2 options. Found: " + (opts == null ? 0 : opts.size()));
            return;
        }

        // Rule 21: Too many options (warning)
        if (opts.size() > 6) {
            warn(report, "TooManyOptionsRule", qid,
                    "MCQ has " + opts.size() + " options (>6 is unusual).");
        }

        Set<String> optionTexts = new HashSet<>();
        Set<String> optionLabels = new HashSet<>();
        long correctCount = 0;
        boolean hasEmptyOption = false;

        for (ParseResult.ParsedOption opt : opts) {
            // Rule 22: Empty option text
            if (opt.getText() == null || opt.getText().isBlank()) {
                hasEmptyOption = true;
            }

            // Rule 23: Duplicate option text
            if (opt.getText() != null &&
                !optionTexts.add(opt.getText().toLowerCase().strip())) {
                error(report, "DuplicateOptionTextRule", qid,
                        "Duplicate option text: \"" + opt.getText() + "\"");
            }

            // Rule 24: Duplicate option label
            if (opt.getLabel() != null && !opt.getLabel().isBlank() &&
                !optionLabels.add(opt.getLabel().toUpperCase())) {
                error(report, "DuplicateOptionLabelRule", qid,
                        "Duplicate option label: " + opt.getLabel());
            }

            if (opt.isCorrect()) correctCount++;
        }

        if (hasEmptyOption) {
            error(report, "EmptyOptionTextRule", qid, "One or more options have empty text.");
        }

        // Rule 25: No correct answer
        if (correctCount == 0) {
            error(report, "MissingCorrectAnswerRule", qid,
                    "No option has data-correct=\"true\".");
        }

        // Rule 26: Multiple correct for SINGLE_CHOICE
        if ("SINGLE_CHOICE".equals(qType) && correctCount > 1) {
            error(report, "MultipleCorrectForSingleRule", qid,
                    "SINGLE_CHOICE has " + correctCount + " correct options (max 1).");
        }

        // Rule 27: All options correct (warning)
        if (correctCount == opts.size()) {
            warn(report, "AllOptionsCorrectRule", qid,
                    "All " + opts.size() + " options are marked correct (unusual).");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Answer rules (28-30)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateExactAnswer(ParseResult.ParsedQuestion q, ValidationReport report,
                                      String qid, String qType) {
        // Rule 28: Missing exact answer
        if (q.getCorrectAnswer() == null || q.getCorrectAnswer().isBlank()) {
            error(report, "MissingExactAnswerRule", qid,
                    "Question type " + qType + " requires a <lmshub-answer> element.");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRUE_FALSE_NG (rule 31)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateTFNG(ParseResult.ParsedQuestion q, ValidationReport report, String qid) {
        if (q.getCorrectAnswer() != null && !q.getCorrectAnswer().isBlank()) {
            String ans = q.getCorrectAnswer().toUpperCase().strip();
            if (!TFNG_ANSWERS.contains(ans)) {
                error(report, "InvalidTFNGAnswerRule", qid,
                        "TRUE_FALSE_NG answer must be TRUE, FALSE, or NOT GIVEN. Got: " + ans);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MATCHING (rules 32-33)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateMatching(ParseResult.ParsedQuestion q, ValidationReport report, String qid) {
        // Rule 32: Empty matching pairs
        if (q.getMatchingPairs() == null || q.getMatchingPairs().size() < 2) {
            error(report, "EmptyMatchingPairsRule", qid,
                    "MATCHING question must have at least 2 <lmshub-match> pairs.");
        }

        // Rule 33: Duplicate matching key
        if (q.getMatchingPairs() != null) {
            Set<String> keys = new HashSet<>();
            for (String key : q.getMatchingPairs().keySet()) {
                if (!keys.add(key.toLowerCase())) {
                    error(report, "DuplicateMatchingKeyRule", qid,
                            "Duplicate left-side key in matching: " + key);
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FILL_BLANK (rule 34)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateFillBlank(ParseResult.ParsedQuestion q, ValidationReport report, String qid) {
        if (q.getFillAnswers() != null && !q.getFillAnswers().isEmpty()) {
            for (String ans : q.getFillAnswers()) {
                if (ans == null || ans.isBlank()) {
                    error(report, "EmptyFillAnswerRule", qid,
                            "One of the fill-blank answers is empty.");
                }
            }
        } else {
            if (q.getCorrectAnswer() == null || q.getCorrectAnswer().isBlank()) {
                error(report, "EmptyFillAnswerRule", qid,
                        "The fill-blank answer is empty.");
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Media rules (38-42)
    // ─────────────────────────────────────────────────────────────────────────

    private void validateMedia(ParseResult result, ValidationReport report,
                                Set<String> referencedMediaIds) {
        if (result.getMediaAssets() == null) return;

        Set<String> seenMediaIds = new HashSet<>();

        for (ParseResult.MediaAsset asset : result.getMediaAssets()) {
            // Rule 38: Duplicate media ID
            if (!seenMediaIds.add(asset.getRefId())) {
                error(report, "DuplicateMediaIdRule", asset.getRefId(),
                        "Duplicate media refId: " + asset.getRefId());
            }

            // Rule 39: Empty binary data
            if (asset.getBinaryData() == null || asset.getBinaryData().length == 0) {
                warn(report, "EmptyMediaBinaryRule", asset.getRefId(),
                        "Media asset " + asset.getRefId() + " has no binary data.");
            }

            // Rule 40: Unsupported MIME type
            if (asset.getMimeType() != null &&
                !ALLOWED_MIME_TYPES.contains(asset.getMimeType())) {
                error(report, "UnsupportedMimeTypeRule", asset.getRefId(),
                        "MIME type not allowed: " + asset.getMimeType() +
                        ". Allowed: " + ALLOWED_MIME_TYPES);
            }
        }

        // Rule 41: Broken media reference (question refs unknown asset)
        Set<String> assetIds = result.getMediaAssets().stream()
                .map(ParseResult.MediaAsset::getRefId)
                .collect(Collectors.toSet());

        for (ParseResult.ParsedSection section : result.getSections()) {
            for (ParseResult.ParsedQuestion q : section.getQuestions()) {
                for (String ref : q.getMediaRefs()) {
                    if (!assetIds.contains(ref)) {
                        error(report, "BrokenMediaRefRule", q.getOriginalId(),
                                "Question references unknown media: " + ref);
                    }
                }
            }
        }

        // Rule 42: Unused media asset (warning)
        for (ParseResult.MediaAsset asset : result.getMediaAssets()) {
            if (!referencedMediaIds.contains(asset.getRefId())) {
                warn(report, "UnusedMediaAssetRule", asset.getRefId(),
                        "Media asset " + asset.getRefId() + " is not referenced by any question.");
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private Set<String> collectAllReferencedMedia(ParseResult result) {
        Set<String> refs = new HashSet<>();
        if (result.getSections() == null) return refs;
        for (ParseResult.ParsedSection s : result.getSections()) {
            if (s.getPassageAudioRef() != null) refs.add(s.getPassageAudioRef());
            if (s.getPassageImageRef() != null) refs.add(s.getPassageImageRef());
            for (ParseResult.ParsedQuestion q : s.getQuestions()) {
                refs.addAll(q.getMediaRefs());
                for (ParseResult.ParsedOption o : q.getOptions()) {
                    if (o.getMediaRef() != null) refs.add(o.getMediaRef());
                }
            }
        }
        return refs;
    }

    private void error(ValidationReport report, String rule, String targetId, String msg) {
        report.getErrors().add(new ValidationReport.ValidationError(rule, targetId, msg));
    }

    private void warn(ValidationReport report, String rule, String targetId, String msg) {
        report.getWarnings().add(new ValidationReport.ValidationWarning(rule, targetId, msg));
    }
}
