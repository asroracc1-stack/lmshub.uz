package com.lmscrm.backend.service.exam.verification;

import com.lmscrm.backend.domain.entity.AnswerKey;
import com.lmscrm.backend.dto.exam.runtime.ReviewDTO;
import org.springframework.stereotype.Component;

@Component
public class SingleChoiceVerificationStrategy implements VerificationStrategy {

    @Override
    public boolean supports(String answerType) {
        return "SINGLE_CHOICE".equalsIgnoreCase(answerType) || "TRUE_FALSE".equalsIgnoreCase(answerType) || "YES_NO_NOT_GIVEN".equalsIgnoreCase(answerType);
    }

    @Override
    public ReviewDTO verify(String studentAnswer, AnswerKey answerKey) {
        boolean isCorrect = false;
        
        if (studentAnswer != null && answerKey.getCorrectAnswer() != null) {
            // Case-insensitive exact match
            isCorrect = studentAnswer.trim().equalsIgnoreCase(answerKey.getCorrectAnswer().trim());
        }

        ReviewDTO review = new ReviewDTO();
        review.setQuestionId(answerKey.getQuestion().getId());
        review.setQuestionText(answerKey.getQuestion().getText());
        review.setQuestionType(answerKey.getQuestion().getQuestionType());
        review.setStudentAnswer(studentAnswer);
        review.setCorrectAnswer(answerKey.getCorrectAnswer());
        review.setCorrect(isCorrect);
        review.setPointsAwarded(isCorrect ? answerKey.getPoints() : 0);
        
        return review;
    }
}
