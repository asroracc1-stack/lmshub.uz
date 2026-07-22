package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "import_logs", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "exam_id", nullable = false)
    private UUID examId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    /** Path to ZIP archive: archive/imports/{examId}/exam.zip */
    @Column(name = "storage_path")
    private String storagePath;

    /** SHA-256 of original HTML bytes */
    @Column(name = "sha256_hash")
    private String sha256Hash;

    @Column(name = "question_count")
    private int questionCount;

    @Column(name = "section_count")
    private int sectionCount;

    @Column(name = "warning_count")
    private int warningCount;

    @Column(name = "error_count")
    private int errorCount;

    /** e.g. "lmshub-v1" */
    @Column(name = "html_version")
    private String htmlVersion;

    /** e.g. "LmsHubHtmlParser-1.0" */
    @Column(name = "parser_version")
    private String parserVersion;

    /** Application build version e.g. "1.0.0" */
    @Column(name = "build_version")
    private String buildVersion;

    @Column(name = "import_duration_ms")
    private long importDurationMs;

    /** "SUCCESS" | "FAILED" */
    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "imported_by")
    private UUID importedBy;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    /** JSON array of warning messages */
    @Column(name = "warnings_summary", columnDefinition = "TEXT")
    private String warningsSummary;

    /** JSON array of error messages */
    @Column(name = "errors_summary", columnDefinition = "TEXT")
    private String errorsSummary;
}
