package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class QuestionDto {
    private UUID id;
    private UUID examId;
    private UUID passageId;
    private String text;          // savol matni (prompt)
    private String questionType;  // mcq, fill, short, tfng, ynng, matching, headings
    private String correctAnswer; // Admin/Teacher uchun (student view da null bo'ladi)
    private Integer points;
    private Integer positionOrder;
    private List<QuestionOptionDto> options;
}
