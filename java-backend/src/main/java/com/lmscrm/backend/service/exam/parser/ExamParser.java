package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;

/**
 * ExamParser — Parses LMSHub HTML v1 specification into a ParseResult.
 *
 * Contract:
 *   - supports() must return true for the format version this parser handles
 *   - parse() NEVER reads CSS, style, class, animation, color, font, theme
 *   - parse() ONLY reads lmshub-* custom elements and data-* attributes
 */
public interface ExamParser {

    /**
     * Returns true if this parser can handle the given format version string.
     * Example: "lmshub-v1"
     */
    boolean supports(String formatVersion);

    /**
     * Parses the HTML bytes into a structured ParseResult.
     * Must be deterministic — same input always produces same output.
     */
    ParseResult parse(byte[] fileBytes, String fileName) throws Exception;
}
