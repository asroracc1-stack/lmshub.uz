package com.lmscrm.backend.dto.aispeaking;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SessionStartRequestDto {
    private String topic;
    private String level;
    private String language;
}
