package com.lmscrm.backend.dto.aispeaking;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoryResponseDto {
    private UUID id;
    private String topic;
    private LocalDateTime date;
    private int duration; // in seconds
    private int score;
    private String language;
}
