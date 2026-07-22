package com.lmscrm.backend.dto.exam.parser;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
public class ValidationReport {
    private boolean isValid;
    private ParseResult parseResult;
    private List<ValidationError> errors = new ArrayList<>();
    private List<ValidationWarning> warnings = new ArrayList<>();

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ValidationError {
        private String ruleName;
        private String targetId;
        private String message;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ValidationWarning {
        private String ruleName;
        private String targetId;
        private String message;
    }
}
