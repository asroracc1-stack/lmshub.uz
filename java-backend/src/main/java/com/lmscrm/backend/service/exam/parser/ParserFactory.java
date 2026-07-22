package com.lmscrm.backend.service.exam.parser;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ParserFactory {

    private final List<ExamParser> parsers;

    public ParserFactory(List<ExamParser> parsers) {
        this.parsers = parsers;
    }

    public ExamParser getParser(String fileName) {
        if (fileName == null) {
            throw new IllegalArgumentException("File name cannot be null");
        }
        
        String lowerCaseName = fileName.toLowerCase();
        
        if (lowerCaseName.endsWith(".pdf")) {
            // PDF parser implementation will be decoupled later
            throw new UnsupportedOperationException("PDF parsing is delegated to an external layout converter first.");
        } else if (lowerCaseName.endsWith(".html") || lowerCaseName.endsWith(".htm")) {
            return parsers.stream()
                    .filter(p -> p instanceof LmsHtmlParser)
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("LmsHtmlParser not found"));
        }
        
        throw new UnsupportedOperationException("No deterministic parser available for file type: " + fileName);
    }
}
