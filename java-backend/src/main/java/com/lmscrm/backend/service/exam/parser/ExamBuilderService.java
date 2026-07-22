package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.dto.exam.parser.ParseResult;
import com.lmscrm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * ExamBuilderService — Converts a validated ParseResult into DB entities.
 *
 * Pipeline:
 *   ParseResult
 *     → Exam (version=1)
 *     → Passage (per section)
 *     → Question[] (bulk saved)
 *     → QuestionOption[] (bulk saved)
 *     → AnswerKey[] (IMMUTABLE, bulk saved)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExamBuilderService {

    private final ExamRepository examRepository;
    private final PassageRepository passageRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerKeyRepository answerKeyRepository;

    @Transactional(rollbackFor = Exception.class)
    public Exam buildAndSave(ParseResult result, User createdBy) {
        log.info("Building exam from ParseResult: {} sections, {} questions",
                result.getSections().size(), result.totalQuestionCount());

        // ── 1. Create Exam ───────────────────────────────────────────────────
        ExamType examType = resolveExamType(result.getExamType());
        Exam exam = Exam.builder()
                .title(result.getExamTitle() != null ? result.getExamTitle() : "Imported Exam")
                .type(examType)
                .durationMinutes(result.getDurationMinutes() != null ? result.getDurationMinutes() : 60)
                .passingScore(50)
                .isActive(true)
                .isAiImported(false)
                .status("DRAFT")
                .version(1)
                .requiredPack("free")
                .createdBy(createdBy)
                .build();
        examRepository.save(exam);
        log.info("Exam created: {} ({})", exam.getId(), exam.getTitle());

        // ── 2. Create Passages + Questions per section ────────────────────────
        for (ParseResult.ParsedSection section : result.getSections()) {
            buildSection(section, exam);
        }

        return exam;
    }

    private void buildSection(ParseResult.ParsedSection section, Exam exam) {
        // Create Passage
        Passage passage = Passage.builder()
                .exam(exam)
                .title(section.getSectionTitle() != null ? section.getSectionTitle() : "Section " + section.getOrder())
                .content(section.getPassageText() != null ? section.getPassageText() : "")
                .audioUrl(section.getPassageAudioRef())
                .imageUrl(section.getPassageImageRef())
                .instructions(section.getInstructions())
                .positionOrder(section.getOrder())
                .timeLimitSeconds(section.getTimeLimitSeconds())
                .shuffleQuestions(false)
                .shuffleOptions(false)
                .autoNumbering(true)
                .lockNavigation(false)
                .questionRandomization(false)
                .questions(new ArrayList<>())
                .build();
        passageRepository.save(passage);

        if (section.getQuestions() == null || section.getQuestions().isEmpty()) return;

        // ── Bulk build questions ──────────────────────────────────────────────
        List<Question> questions = new ArrayList<>();
        for (ParseResult.ParsedQuestion pq : section.getQuestions()) {
            questions.add(buildQuestion(pq, passage, exam));
        }
        questionRepository.saveAll(questions);  // ✅ one batch insert

        // ── Bulk build options + answer keys ──────────────────────────────────
        List<QuestionOption> allOptions = new ArrayList<>();
        List<AnswerKey>      allKeys    = new ArrayList<>();

        for (int i = 0; i < section.getQuestions().size(); i++) {
            ParseResult.ParsedQuestion pq = section.getQuestions().get(i);
            Question q = questions.get(i);

            for (ParseResult.ParsedOption po : pq.getOptions()) {
                allOptions.add(buildOption(po, q));
            }
            allKeys.add(buildAnswerKey(pq, q));
        }

        questionOptionRepository.saveAll(allOptions);  // ✅ batch
        answerKeyRepository.saveAll(allKeys);           // ✅ batch

        log.info("Section '{}': saved {} questions, {} options, {} answer keys",
                section.getSectionTitle(), questions.size(), allOptions.size(), allKeys.size());
    }

    // ─────────────────────────────────────────────────────────────────────────

    private Question buildQuestion(ParseResult.ParsedQuestion pq, Passage passage, Exam exam) {
        return Question.builder()
                .exam(exam)
                .passage(passage)
                .text(pq.getRawText() != null ? pq.getRawText() : "")
                .questionType(pq.getQuestionType() != null ? pq.getQuestionType().toLowerCase() : "single_choice")
                .points(Math.max(pq.getPoints(), 1))
                .negativeMarks(0.0)
                .positionOrder(pq.getOrder())
                .explanation(pq.getExplanation())
                .status("published")
                .version(1)
                .parentId(null)
                .options(new ArrayList<>())
                .build();
    }

    private QuestionOption buildOption(ParseResult.ParsedOption po, Question q) {
        return QuestionOption.builder()
                .question(q)
                .text(po.getText() != null ? po.getText() : "")
                .isCorrect(po.isCorrect())
                .imageUrl(null) // Media URL resolved separately by MediaProcessor
                .imagePosition("left")
                .build();
    }

    private AnswerKey buildAnswerKey(ParseResult.ParsedQuestion pq, Question q) {
        String correctAnswer = resolveCorrectAnswer(pq);
        String validator = resolveValidator(pq.getQuestionType());

        return AnswerKey.builder()
                .question(q)
                .answerType(pq.getQuestionType() != null ? pq.getQuestionType().toLowerCase() : "single_choice")
                .validator(validator)
                .correctAnswer(correctAnswer)
                .points(Math.max(pq.getPoints(), 1))
                .partialScoring(false)
                .negativeMarking(0.0)
                .tolerance(0.0)
                .build();
    }

    private String resolveCorrectAnswer(ParseResult.ParsedQuestion pq) {
        // Explicit answer (fill blank, TFNG, math)
        if (pq.getCorrectAnswer() != null && !pq.getCorrectAnswer().isBlank()) {
            return pq.getCorrectAnswer();
        }
        // MCQ: join all correct option texts
        return pq.getOptions().stream()
                .filter(ParseResult.ParsedOption::isCorrect)
                .map(ParseResult.ParsedOption::getText)
                .reduce((a, b) -> a + "|" + b)
                .orElse("");
    }

    private String resolveValidator(String questionType) {
        if (questionType == null) return "GenericValidator";
        return switch (questionType.toUpperCase()) {
            case "SINGLE_CHOICE"                          -> "SingleChoiceValidator";
            case "MULTIPLE_CHOICE"                        -> "MultipleChoiceValidator";
            case "TRUE_FALSE_NG", "YES_NO_NG"             -> "TrueFalseValidator";
            case "MATCHING", "HEADING_MATCH"              -> "MatchingValidator";
            case "ORDERING"                               -> "OrderingValidator";
            case "FILL_BLANK", "SENTENCE_COMPLETION",
                 "SHORT_ANSWER", "MAP_LABELLING"          -> "FillBlankValidator";
            case "MATH"                                   -> "MathValidator";
            case "ESSAY"                                  -> "ManualGradingValidator";
            default                                       -> "GenericValidator";
        };
    }

    private ExamType resolveExamType(String examType) {
        if (examType == null || examType.isBlank()) return ExamType.IELTS;
        try {
            return ExamType.valueOf(examType.toUpperCase().replace("-", "_"));
        } catch (IllegalArgumentException e) {
            log.warn("Unknown exam type '{}', defaulting to IELTS", examType);
            return ExamType.IELTS;
        }
    }
}
