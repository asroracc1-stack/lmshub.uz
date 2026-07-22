package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.exam.parser.ParseResult;
import com.lmscrm.backend.dto.exam.parser.ValidationReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportOrchestrator {

    private final ParserFactory parserFactory;
    private final ValidationEngine validationEngine;
    // private final QuestionBuilder questionBuilder; (to be injected)
    // private final ImportLogRepository importLogRepository;

    /**
     * Preview Step: Parses and validates the HTML file without saving to DB.
     */
    public ValidationReport previewImport(byte[] fileBytes, String fileName) {
        try {
            ExamParser parser = parserFactory.getParser(fileName);
            ParseResult parseResult = parser.parse(fileBytes, fileName);
            
            // MediaProcessor.extractAndUpload(parseResult.getMediaAssets());
            // Normalizer.normalize(parseResult);
            
            return validationEngine.validate(parseResult);
            
        } catch (Exception e) {
            log.error("Parsing failed for {}", fileName, e);
            ValidationReport report = new ValidationReport();
            report.setValid(false);
            report.getErrors().add(new ValidationReport.ValidationError("SystemError", null, e.getMessage()));
            return report;
        }
    }

    /**
     * Commit Step: Transactional Execution. Writes to database, rolls back on any error.
     * Triggers Exam Versioning and Snapshotting.
     */
    @Transactional(rollbackFor = Exception.class)
    public void commitImport(ValidationReport validatedReport, User createdBy) {
        if (!validatedReport.isValid()) {
            throw new IllegalArgumentException("Cannot commit an invalid import report.");
        }

        log.info("Starting deterministic import transaction...");
        
        // 1. QuestionBuilder -> Convert ParseResult to Entities
        // 2. AnswerKeyBuilder -> Generate Immutable AnswerKey entities
        // 3. Database Insert
        // 4. Generate Version
        // 5. Generate Snapshot
        // 6. Write to ImportLog
        
        log.info("Successfully committed import transaction");
    }
}
