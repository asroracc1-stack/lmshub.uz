package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class ExamSubmitRequest {
    private UUID exam_id;
    private Map<String, String> answers;
    private Map<String, Long> time_spent;
    private String writing_answer;
}
