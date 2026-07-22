package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class ExamSubmitRequest {
    private UUID exam_id;
    private UUID examId;
    private Map<String, String> answers;
    private Map<String, Long> time_spent;
    private Map<String, Long> timeSpent;
    private String writing_answer;
    private String writingAnswer;
    private List<ExamViolationDto> violations;
    private Boolean auto_submitted;
    private Boolean autoSubmitted;

    public UUID getExamId() {
        return examId != null ? examId : exam_id;
    }

    public Map<String, Long> getTimeSpentMap() {
        if (timeSpent != null) return timeSpent;
        if (time_spent != null) return time_spent;
        return Collections.emptyMap();
    }

    public Boolean isAutoSubmitted() {
        if (autoSubmitted != null) return autoSubmitted;
        if (auto_submitted != null) return auto_submitted;
        return false;
    }
}
