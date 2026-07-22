package com.lmscrm.backend.service.exam.scoring;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AnswerValidatorFactory {

    private final List<AnswerValidator> validators;

    public AnswerValidator getValidator(String answerType) {
        if (answerType == null) {
            return getFallbackValidator();
        }

        return validators.stream()
                .filter(v -> v.supports(answerType))
                .findFirst()
                .orElseGet(this::getFallbackValidator);
    }

    private AnswerValidator getFallbackValidator() {
        return validators.stream()
                .filter(v -> v instanceof SingleChoiceValidator)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No fallback validator found (SingleChoiceValidator must be defined)"));
    }
}
