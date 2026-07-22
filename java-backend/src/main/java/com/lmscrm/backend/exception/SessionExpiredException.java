package com.lmscrm.backend.exception;

public class SessionExpiredException extends RuntimeException {
    public SessionExpiredException(String sessionId) {
        super("Import session expired or not found: " + sessionId +
              ". Please re-upload the file and try again.");
    }
}
