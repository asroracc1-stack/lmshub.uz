package com.lmscrm.backend.service.exam.scoring;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ValidationResult {
    boolean isCorrect;
    double pointsEarned;
    double negativeMarks;
    String feedback;
}
