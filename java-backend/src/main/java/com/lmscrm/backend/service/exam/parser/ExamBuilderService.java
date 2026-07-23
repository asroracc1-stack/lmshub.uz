package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.dto.exam.parser.ParseResult;
import com.lmscrm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ExamBuilderService — Converts a validated ParseResult into DB entities.
 *
 * Pipeline:
 *   ParseResult
 *     → Exam (status="PUBLISHED", isActive=true)
 *     → Passage (per section)
 *     → Question[] (bulk saved)
 *     → QuestionOption[] (bulk saved)
 *     → AnswerKey[] (IMMUTABLE, bulk saved)
 *     → QuestionBankItem[] (populates Super Admin Question Bank)
 *     → QuestionBankOption[] (populates Question Bank options)
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
    private final QuestionBankRepository questionBankRepository;
    private final QuestionBankOptionRepository questionBankOptionRepository;

    @Transactional(rollbackFor = Exception.class)
    public Exam buildAndSave(ParseResult result, User createdBy) {
        log.info("Building exam from ParseResult: {} sections, {} questions",
                result.getSections().size(), result.totalQuestionCount());

        // ── 1. Create Exam (status="PUBLISHED" so it appears on Student User Panel) ──
        ExamType examType = resolveExamType(result.getExamType());
        Exam exam = Exam.builder()
                .title(result.getExamTitle() != null ? result.getExamTitle() : "Imported Exam")
                .type(examType)
                .durationMinutes(result.getDurationMinutes() != null ? result.getDurationMinutes() : 60)
                .passingScore(50)
                .isActive(true)
                .isAiImported(false)
                .status("PUBLISHED")
                .version(1)
                .requiredPack("free")
                .createdBy(createdBy)
                .build();
        examRepository.save(exam);
        log.info("Exam created and published: {} ({})", exam.getId(), exam.getTitle());

        // ── 2. Create Passages + Questions per section ────────────────────────
        for (ParseResult.ParsedSection section : result.getSections()) {
            buildSection(section, exam, result, createdBy);
        }

        return exam;
    }

    private void buildSection(ParseResult.ParsedSection section, Exam exam, ParseResult result, User createdBy) {
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

        // ── Bulk build questions for Exam engine ──────────────────────────────
        List<Question> questions = new ArrayList<>();
        List<QuestionBankItem> bankItems = new ArrayList<>();

        for (ParseResult.ParsedQuestion pq : section.getQuestions()) {
            questions.add(buildQuestion(pq, passage, exam));

            // Also build QuestionBankItem for Super Admin Question Bank
            QuestionBankItem bankItem = QuestionBankItem.builder()
                    .subject(result.getSubject() != null && !result.getSubject().isBlank() ? result.getSubject() : "English")
                    .topic(section.getSectionTitle() != null ? section.getSectionTitle() : "Reading Passages")
                    .examCategory(resolveExamCategory(result.getExamType()))
                    .questionType(pq.getQuestionType() != null ? pq.getQuestionType().toLowerCase() : "single_choice")
                    .difficulty("medium")
                    .text(pq.getRawText() != null ? pq.getRawText() : "")
                    .passageText(section.getPassageText())
                    .correctAnswer(resolveCorrectAnswer(pq))
                    .explanation(pq.getExplanation())
                    .points(Math.max(pq.getPoints(), 1))
                    .isActive(true)
                    .usageCount(1)
                    .createdBy(createdBy)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            bankItems.add(bankItem);
        }
        questionRepository.saveAll(questions);          // ✅ Batch insert into questions table
        questionBankRepository.saveAll(bankItems);       // ✅ Batch insert into question_bank_items table

        // ── Bulk build options + answer keys ──────────────────────────────────
        List<QuestionOption> allOptions = new ArrayList<>();
        List<AnswerKey>      allKeys    = new ArrayList<>();
        List<QuestionBankOption> bankOptions = new ArrayList<>();

        for (int i = 0; i < section.getQuestions().size(); i++) {
            ParseResult.ParsedQuestion pq = section.getQuestions().get(i);
            Question q = questions.get(i);
            QuestionBankItem bankItem = bankItems.get(i);

            int optOrder = 1;
            for (ParseResult.ParsedOption po : pq.getOptions()) {
                allOptions.add(buildOption(po, q));

                QuestionBankOption qbo = QuestionBankOption.builder()
                        .questionBankItem(bankItem)
                        .text(po.getText() != null ? po.getText() : "")
                        .isCorrect(po.isCorrect())
                        .positionOrder(optOrder++)
                        .build();
                bankOptions.add(qbo);
            }
            allKeys.add(buildAnswerKey(pq, q));
        }

        questionOptionRepository.saveAll(allOptions);     // ✅ batch
        answerKeyRepository.saveAll(allKeys);              // ✅ batch
        if (!bankOptions.isEmpty()) {
            questionBankOptionRepository.saveAll(bankOptions); // ✅ batch
        }

        log.info("Section '{}': saved {} questions (Exam + QuestionBank), {} options, {} answer keys",
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
                .imageUrl(null)
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
        if (pq.getFillAnswers() != null && !pq.getFillAnswers().isEmpty()) {
            return String.join(", ", pq.getFillAnswers());
        }
        if (pq.getCorrectAnswer() != null && !pq.getCorrectAnswer().isBlank()) {
            return pq.getCorrectAnswer();
        }
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
            case "FILL_BLANK", "SHORT_ANSWER"             -> "ExactMatchValidator";
            default                                       -> "GenericValidator";
        };
    }

    private ExamType resolveExamType(String examTypeStr) {
        if (examTypeStr == null) return ExamType.READING;
        String upper = examTypeStr.toUpperCase().trim();
        if (upper.contains("READING")) return ExamType.READING;
        if (upper.contains("LISTENING")) return ExamType.LISTENING;
        if (upper.contains("WRITING")) return ExamType.WRITING;
        if (upper.contains("SPEAKING")) return ExamType.SPEAKING;
        if (upper.contains("SAT")) return ExamType.SAT;
        if (upper.contains("MATH")) return ExamType.MATH;
        if (upper.contains("NATIONAL") || upper.contains("MILLIY")) return ExamType.NATIONAL_CERT;
        if (upper.contains("IELTS")) return ExamType.IELTS;
        try {
            return ExamType.valueOf(upper);
        } catch (IllegalArgumentException e) {
            return ExamType.READING;
        }
    }

    private String resolveExamCategory(String examCategoryStr) {
        if (examCategoryStr == null) return "IELTS";
        String upper = examCategoryStr.toUpperCase().trim();
        if (upper.contains("IELTS")) return "IELTS";
        if (upper.contains("SAT")) return "SAT";
        if (upper.contains("NATIONAL") || upper.contains("MILLIY")) return "MILLIY_SERTIFIKAT";
        return "GENERAL";
    }
}
