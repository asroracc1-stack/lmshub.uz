package com.lmscrm.backend.dto.exam;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingStatisticsDto {
    private double overallReadingBand;
    private int totalTestsSolved;
    private int totalCorrectAnswers;
    private int totalQuestionsCount;
    private double accuracy;
    private double highestBand;
    private int averageTimeMinutes;
    private double completionRate;
}
