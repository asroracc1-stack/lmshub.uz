package com.lmscrm.backend.dto.aispeaking;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatisticsResponseDto {
    private int pronunciation;
    private int fluency;
    private int grammar;
    private int vocabulary;
    private int confidence;
    private int dailySpeakingTime;
    private int streak;
    private int wordsLearned;
    private int sessionsCompleted;
}
