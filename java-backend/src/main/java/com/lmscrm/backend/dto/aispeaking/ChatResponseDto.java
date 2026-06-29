package com.lmscrm.backend.dto.aispeaking;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponseDto {
    private String response;
    private UUID sessionId;
    private String status;
}
