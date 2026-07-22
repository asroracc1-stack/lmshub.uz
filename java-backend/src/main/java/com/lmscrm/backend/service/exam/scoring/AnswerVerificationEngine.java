package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;
import com.lmscrm.backend.domain.entity.Question;
import com.lmscrm.backend.domain.entity.QuestionOption;
import com.lmscrm.backend.repository.AnswerKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnswerVerificationEngine {

    private final AnswerKeyRepository answerKeyRepository;
    private final AnswerValidatorFactory validatorFactory;

    @Transactional
    public ValidationResult verifyAnswer(Question question, String studentAnswer) {
        AnswerKey key = getOrCreateAnswerKey(question);
        AnswerValidator validator = validatorFactory.getValidator(key.getValidator());
        return validator.validate(key, studentAnswer);
    }

    @Transactional
    public AnswerKey getOrCreateAnswerKey(Question question) {
        return answerKeyRepository.findByQuestionId(question.getId())
                .orElseGet(() -> {
                    // Backfill AnswerKey from existing options or numeric values in legacy Question
                    String correctAns = "";
                    String type = question.getQuestionType() != null ? question.getQuestionType() : "mcq";

                    if (question.getOptions() != null && !question.getOptions().isEmpty()) {
                        correctAns = question.getOptions().stream()
                                .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                                .map(QuestionOption::getText)
                                .collect(Collectors.joining(","));
                    } else if (question.getNumericAnswer() != null) {
                        correctAns = String.valueOf(question.getNumericAnswer());
                    } else if (question.getMatchingPairs() != null) {
                        correctAns = question.getMatchingPairs();
                    } else if (question.getFillTemplate() != null) {
                        correctAns = question.getFillTemplate();
                    }

                    String validatorName = "SingleChoiceValidator";
                    if (type.equalsIgnoreCase("multiple_choice") || type.equalsIgnoreCase("multi_select") || type.equalsIgnoreCase("multiplechoice")) {
                        validatorName = "MultipleChoiceValidator";
                    } else if (type.equalsIgnoreCase("tfng") || type.equalsIgnoreCase("ynng") || type.equalsIgnoreCase("true_false")) {
                        validatorName = "TrueFalseValidator";
                    } else if (type.equalsIgnoreCase("matching") || type.equalsIgnoreCase("headings")) {
                        validatorName = "MatchingValidator";
                    } else if (type.equalsIgnoreCase("ordering")) {
                        validatorName = "OrderingValidator";
                    } else if (type.equalsIgnoreCase("fill") || type.equalsIgnoreCase("fill_blank") || type.equalsIgnoreCase("short_answer") || type.equalsIgnoreCase("short")) {
                        validatorName = "FillBlankValidator";
                    } else if (type.equalsIgnoreCase("math") || type.equalsIgnoreCase("numeric")) {
                        validatorName = "MathValidator";
                    } else if (type.equalsIgnoreCase("essay") || type.equalsIgnoreCase("speaking")) {
                        validatorName = "ManualGradingValidator";
                    }

                    AnswerKey ak = AnswerKey.builder()
                            .question(question)
                            .answerType(type)
                            .validator(validatorName)
                            .correctAnswer(correctAns)
                            .points(question.getPoints() != null ? question.getPoints() : 1)
                            .partialScoring(false)
                            .negativeMarking(question.getNegativeMarks() != null ? question.getNegativeMarks() : 0.0)
                            .tolerance(question.getNumericTolerance() != null ? question.getNumericTolerance() : 0.0)
                            .build();

                    return answerKeyRepository.save(ak);
                });
    }
}
