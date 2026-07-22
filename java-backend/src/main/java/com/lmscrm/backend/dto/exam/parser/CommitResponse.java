package com.lmscrm.backend.dto.exam.parser;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommitResponse {
    private UUID examId;
    private int questionCount;
    private int sectionCount;
    private String importLogId;
    private List<String> warnings;
}
