package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;

/**
 * Common interface for all deterministic parsing engines.
 */
public interface ExamParser {
    
    /**
     * Parses a raw file into a standardized ParseResult
     * @param fileBytes The raw binary data of the file
     * @param fileName The original file name
     * @return ParseResult containing extracted questions and media
     * @throws Exception if parsing critically fails
     */
    ParseResult parse(byte[] fileBytes, String fileName) throws Exception;
}
