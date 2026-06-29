package com.lmscrm.backend.dto.aispeaking;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionEndResponseDto {
    private UUID sessionId;
    private String status;
    private ScoreDto score;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScoreDto {
        private int pronunciation;
        private int fluency;
        private int grammar;
        private int vocabulary;
        private int confidence;
        private int overall;
    }
}
