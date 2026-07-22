package com.lmscrm.backend.service.exam.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lmscrm.backend.domain.entity.Exam;
import com.lmscrm.backend.domain.entity.ImportLog;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.exam.parser.*;
import com.lmscrm.backend.repository.ImportLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * ImportOrchestrator — Coordinates the full import pipeline.
 *
 * Pipeline:
 *   previewImport(bytes) → {importSessionId, ValidationReport, PreviewStatistics}
 *   commitImport(sessionId, user) → {examId, questionCount, sectionCount}
 *
 * Frontend NEVER sees ParseResult.
 * Frontend only receives importSessionId and sends it back to commit.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportOrchestrator {

    private static final String PARSER_VERSION = LmsHubHtmlParser.PARSER_VERSION;
    private static final String BUILD_VERSION  = "1.0.0";

    private final ParserFactory        parserFactory;
    private final ValidationEngine     validationEngine;
    private final MediaProcessor       mediaProcessor;
    private final ExamBuilderService   examBuilderService;
    private final ImportArchiveService archiveService;
    private final ImportSessionStore   sessionStore;
    private final ImportLogRepository  importLogRepository;
    private final ObjectMapper         objectMapper;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Preview
    // ─────────────────────────────────────────────────────────────────────────

    public PreviewResponse previewImport(byte[] fileBytes, String fileName) {
        log.info("Import preview started: {}", fileName);
        long start = System.currentTimeMillis();

        try {
            // 1. Select correct parser by reading HTML metadata
            ExamParser parser = parserFactory.getParser(fileBytes);

            // 2. Parse → ParseResult (NO CSS/layout, ONLY data)
            ParseResult parseResult = parser.parse(fileBytes, fileName);

            // 3. Process media assets (assign UUIDs, detect MIME, etc.)
            mediaProcessor.processAll(parseResult);

            // 4. Validate (42 rules)
            ValidationReport report = validationEngine.validate(parseResult);

            // 5. Save ImportSession to backend cache (30 min TTL)
            String sessionId = UUID.randomUUID().toString();
            ImportSession session = ImportSession.builder()
                    .id(sessionId)
                    .parseResult(parseResult)
                    .report(report)
                    .originalBytes(fileBytes)
                    .fileName(fileName)
                    .createdAt(LocalDateTime.now())
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .build();
            sessionStore.save(session);

            // 6. Build preview statistics
            PreviewStatistics stats = buildStatistics(parseResult, report);

            log.info("Import preview done in {}ms: {} questions, {} sections, valid={}",
                    System.currentTimeMillis() - start,
                    parseResult.totalQuestionCount(),
                    parseResult.getSections().size(),
                    report.isValid());

            return PreviewResponse.builder()
                    .importSessionId(sessionId)
                    .report(report)
                    .statistics(stats)
                    .build();

        } catch (com.lmscrm.backend.exception.UnsupportedFormatException e) {
            log.warn("Unsupported format: {}", e.getMessage());
            ValidationReport errorReport = buildErrorReport(e.getMessage());
            return PreviewResponse.builder()
                    .importSessionId(null)
                    .report(errorReport)
                    .statistics(null)
                    .build();

        } catch (Exception e) {
            log.error("Import preview failed for {}", fileName, e);
            ValidationReport errorReport = buildErrorReport("Parse error: " + e.getMessage());
            return PreviewResponse.builder()
                    .importSessionId(null)
                    .report(errorReport)
                    .statistics(null)
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Commit
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(rollbackFor = Exception.class)
    public CommitResponse commitImport(String importSessionId, User createdBy) {
        log.info("Import commit started: session={}", importSessionId);
        long start = System.currentTimeMillis();

        // 1. Retrieve session (throws SessionExpiredException if expired)
        ImportSession session = sessionStore.get(importSessionId);

        // 2. Only allow valid reports
        if (!session.getReport().isValid()) {
            throw new IllegalStateException(
                "Cannot commit an import with validation errors. " +
                "Please fix all errors and re-upload.");
        }

        ParseResult parseResult = session.getParseResult();

        // 3. Build and save all entities to DB (bulk inserts, one transaction)
        Exam exam = examBuilderService.buildAndSave(parseResult, createdBy);

        // 4. Archive original HTML + media to ZIP
        String zipPath;
        try {
            zipPath = archiveService.archive(
                    exam.getId(),
                    session.getOriginalBytes(),
                    session.getFileName(),
                    parseResult.getMediaAssets()
            );
        } catch (Exception e) {
            log.warn("Archive failed (non-fatal): {}", e.getMessage());
            zipPath = null;
        }

        long durationMs = System.currentTimeMillis() - start;

        // 5. Write ImportLog
        List<String> warningMsgs = session.getReport().getWarnings().stream()
                .map(ValidationReport.ValidationWarning::getMessage)
                .collect(Collectors.toList());
        List<String> errorMsgs = session.getReport().getErrors().stream()
                .map(ValidationReport.ValidationError::getMessage)
                .collect(Collectors.toList());

        ImportLog importLog = ImportLog.builder()
                .examId(exam.getId())
                .fileName(session.getFileName())
                .storagePath(zipPath)
                .sha256Hash(DigestUtils.sha256Hex(session.getOriginalBytes()))
                .questionCount(parseResult.totalQuestionCount())
                .sectionCount(parseResult.getSections().size())
                .warningCount(session.getReport().getWarnings().size())
                .errorCount(0) // passed validation — no errors
                .htmlVersion(parseResult.getHtmlVersion())
                .parserVersion(PARSER_VERSION)
                .buildVersion(BUILD_VERSION)
                .importDurationMs(durationMs)
                .status("SUCCESS")
                .importedBy(createdBy.getId())
                .importedAt(LocalDateTime.now())
                .warningsSummary(toJson(warningMsgs))
                .errorsSummary("[]")
                .build();
        importLogRepository.save(importLog);

        // 6. Clean up session (free memory)
        sessionStore.delete(importSessionId);

        log.info("Import commit done in {}ms: examId={}, questions={}, sections={}",
                durationMs, exam.getId(), parseResult.totalQuestionCount(),
                parseResult.getSections().size());

        return CommitResponse.builder()
                .examId(exam.getId())
                .questionCount(parseResult.totalQuestionCount())
                .sectionCount(parseResult.getSections().size())
                .importLogId(importLog.getId().toString())
                .warnings(warningMsgs)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private PreviewStatistics buildStatistics(ParseResult result, ValidationReport report) {
        return PreviewStatistics.builder()
                .examTitle(result.getExamTitle())
                .examType(result.getExamType())
                .htmlVersion(result.getHtmlVersion())
                .sectionCount(result.getSections().size())
                .totalQuestions(result.totalQuestionCount())
                .byQuestionType(result.questionTypeBreakdown())
                .mediaAssetCount(result.getMediaAssets() != null ? result.getMediaAssets().size() : 0)
                .warningCount(report.getWarnings().size())
                .errorCount(report.getErrors().size())
                .build();
    }

    private ValidationReport buildErrorReport(String message) {
        ValidationReport report = new ValidationReport();
        report.setValid(false);
        report.getErrors().add(new ValidationReport.ValidationError("SystemError", null, message));
        return report;
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }
}
