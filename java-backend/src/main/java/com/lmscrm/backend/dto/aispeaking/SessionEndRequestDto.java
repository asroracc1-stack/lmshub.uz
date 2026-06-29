package com.lmscrm.backend.dto.aispeaking;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SessionEndRequestDto {
    @NotNull
    private UUID sessionId;
}
