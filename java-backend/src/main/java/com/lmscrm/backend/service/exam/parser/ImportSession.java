package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;
import com.lmscrm.backend.dto.exam.parser.ValidationReport;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ImportSession {
    private String id;
    private ParseResult parseResult;
    private ValidationReport report;
    private byte[] originalBytes;
    private String fileName;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
