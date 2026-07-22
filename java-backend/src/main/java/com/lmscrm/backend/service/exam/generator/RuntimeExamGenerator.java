package com.lmscrm.backend.service.exam.generator;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuntimeExamGenerator {

    private final QuestionBankRepository questionBankRepository;
    private final ExamBlueprintRepository examBlueprintRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final AnswerKeyRepository answerKeyRepository;

    @Transactional
    public List<Question> generateExamQuestions(Exam exam, StudentAttempt attempt) {
        Optional<ExamBlueprint> blueprintOpt = examBlueprintRepository.findByExamId(exam.getId());

        if (blueprintOpt.isEmpty()) {
            // Static exam: load questions where studentAttempt IS NULL and examId matches
            return questionRepository.findByExamIdAndStudentAttemptIsNullOrderByPositionOrderAsc(exam.getId());
        }

        ExamBlueprint blueprint = blueprintOpt.get();
        log.info("Generating dynamic exam questions for attempt {} using blueprint {}", attempt.getId(), blueprint.getId());

        // Find all active questions in bank matching blueprint subject
        List<QuestionBankItem> allMatching = questionBankRepository.findAll().stream()
                .filter(q -> Boolean.TRUE.equals(q.getIsActive()))
                .filter(q -> blueprint.getSubject() == null || blueprint.getSubject().equalsIgnoreCase(q.getSubject()))
                .collect(Collectors.toList());

        List<QuestionBankItem> easyList = allMatching.stream().filter(q -> "easy".equalsIgnoreCase(q.getDifficulty())).collect(Collectors.toList());
        List<QuestionBankItem> mediumList = allMatching.stream().filter(q -> "medium".equalsIgnoreCase(q.getDifficulty())).collect(Collectors.toList());
        List<QuestionBankItem> hardList = allMatching.stream().filter(q -> "hard".equalsIgnoreCase(q.getDifficulty())).collect(Collectors.toList());

        Collections.shuffle(easyList);
        Collections.shuffle(mediumList);
        Collections.shuffle(hardList);

        int easyReq = blueprint.getEasyCount() != null ? blueprint.getEasyCount() : 0;
        int medReq = blueprint.getMediumCount() != null ? blueprint.getMediumCount() : 0;
        int hardReq = blueprint.getHardCount() != null ? blueprint.getHardCount() : 0;

        List<QuestionBankItem> selectedBankItems = new ArrayList<>();
        selectedBankItems.addAll(easyList.subList(0, Math.min(easyReq, easyList.size())));
        selectedBankItems.addAll(mediumList.subList(0, Math.min(medReq, mediumList.size())));
        selectedBankItems.addAll(hardList.subList(0, Math.min(hardReq, hardList.size())));

        List<Question> generatedQuestions = new ArrayList<>();
        int order = 1;

        for (QuestionBankItem bankItem : selectedBankItems) {
            Question question = Question.builder()
                    .exam(exam)
                    .studentAttempt(attempt)
                    .text(bankItem.getText())
                    .questionType(bankItem.getQuestionType())
                    .points(bankItem.getPoints())
                    .positionOrder(order++)
                    .imageUrl(bankItem.getImageUrl())
                    .imagePosition(bankItem.getImagePosition())
                    .audioUrl(bankItem.getAudioUrl())
                    .explanation(bankItem.getExplanation())
                    .tags(bankItem.getTags())
                    .difficulty(bankItem.getDifficulty())
                    .status("published")
                    .version(bankItem.getVersion() != null ? bankItem.getVersion() : 1)
                    .parentId(bankItem.getParentId() != null ? bankItem.getParentId() : bankItem.getId())
                    .build();

            question = questionRepository.save(question);
            generatedQuestions.add(question);

            // Copy options
            if (bankItem.getOptions() != null) {
                for (QuestionBankOption bankOpt : bankItem.getOptions()) {
                    QuestionOption opt = QuestionOption.builder()
                            .question(question)
                            .text(bankOpt.getText())
                            .isCorrect(bankOpt.getIsCorrect())
                            .positionOrder(bankOpt.getPositionOrder())
                            .imageUrl(bankOpt.getImageUrl())
                            .imagePosition(bankOpt.getImagePosition())
                            .build();
                    questionOptionRepository.save(opt);
                }
            }

            // Create/Copy AnswerKey
            String validatorName = "SingleChoiceValidator";
            String qtype = bankItem.getQuestionType() != null ? bankItem.getQuestionType() : "mcq";
            if (qtype.equalsIgnoreCase("multiple_choice") || qtype.equalsIgnoreCase("multi_select") || qtype.equalsIgnoreCase("multiplechoice")) {
                validatorName = "MultipleChoiceValidator";
            } else if (qtype.equalsIgnoreCase("tfng") || qtype.equalsIgnoreCase("ynng") || qtype.equalsIgnoreCase("true_false")) {
                validatorName = "TrueFalseValidator";
            } else if (qtype.equalsIgnoreCase("matching") || qtype.equalsIgnoreCase("headings")) {
                validatorName = "MatchingValidator";
            } else if (qtype.equalsIgnoreCase("ordering")) {
                validatorName = "OrderingValidator";
            } else if (qtype.equalsIgnoreCase("fill") || qtype.equalsIgnoreCase("fill_blank") || qtype.equalsIgnoreCase("short")) {
                validatorName = "FillBlankValidator";
            } else if (qtype.equalsIgnoreCase("math")) {
                validatorName = "MathValidator";
            } else if (qtype.equalsIgnoreCase("essay") || qtype.equalsIgnoreCase("speaking")) {
                validatorName = "ManualGradingValidator";
            }

            AnswerKey ak = AnswerKey.builder()
                    .question(question)
                    .answerType(qtype)
                    .validator(validatorName)
                    .correctAnswer(bankItem.getCorrectAnswer() != null ? bankItem.getCorrectAnswer() : "")
                    .points(bankItem.getPoints())
                    .partialScoring(false)
                    .negativeMarking(0.0)
                    .tolerance(0.0)
                    .build();
            answerKeyRepository.save(ak);
        }

        return generatedQuestions;
    }
}
