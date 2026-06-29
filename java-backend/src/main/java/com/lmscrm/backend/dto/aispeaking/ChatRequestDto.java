package com.lmscrm.backend.dto.aispeaking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestDto {
    @NotBlank
    private String message;

    @NotNull
    private UUID sessionId;

    private String language;
}
