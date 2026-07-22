package com.lmscrm.backend.dto.exam.parser;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviewStatistics {
    private String examTitle;
    private String examType;
    private String htmlVersion;
    private int sectionCount;
    private int totalQuestions;
    private Map<String, Long> byQuestionType;  // {"SINGLE_CHOICE": 15, "FILL_BLANK": 5}
    private int mediaAssetCount;
    private int warningCount;
    private int errorCount;
}
