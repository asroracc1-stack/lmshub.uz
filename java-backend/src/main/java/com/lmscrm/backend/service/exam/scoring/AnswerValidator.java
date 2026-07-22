package com.lmscrm.backend.service.exam.scoring;

import com.lmscrm.backend.domain.entity.AnswerKey;

public interface AnswerValidator {
    boolean supports(String answerType);
    ValidationResult validate(AnswerKey key, String studentAnswer);
}
