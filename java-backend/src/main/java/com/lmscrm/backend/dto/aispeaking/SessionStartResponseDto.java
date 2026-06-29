package com.lmscrm.backend.dto.aispeaking;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionStartResponseDto {
    private UUID id;
    private String topic;
    private String level;
    private String language;
    private LocalDateTime startTime;
}
