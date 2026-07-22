package com.lmscrm.backend.dto.exam.parser;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreviewResponse {
    private String importSessionId;
    private ValidationReport report;
    private PreviewStatistics statistics;
}
