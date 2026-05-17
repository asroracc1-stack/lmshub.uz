package com.lmscrm.backend.dto.exam;

import lombok.Data;

@Data
public class ParseAiRequest {
    private String text;
    private String taskType;
}
