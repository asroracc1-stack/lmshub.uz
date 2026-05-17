package com.lmscrm.backend.dto.exam;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class SubmitExamRequest {

    @NotNull
    private UUID attemptId;

    private List<AnswerRequest> answers;

    @Data
    public static class AnswerRequest {
        @NotNull
        private UUID questionId;
        private UUID selectedOptionId;
    }
}
