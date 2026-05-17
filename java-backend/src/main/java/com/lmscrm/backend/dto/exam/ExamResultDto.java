package com.lmscrm.backend.dto.exam;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ExamResultDto {
    private Double bandScore;
    private Integer correct;
    private Integer total;
    private String kind;
    private List<QuestionDetail> detail;
    private String feedback; // For Writing/Speaking

    @Data
    @Builder
    public static class QuestionDetail {
        private String questionId;
        private String userAns;
        private String correctAns;
        private boolean ok;
    }
}
