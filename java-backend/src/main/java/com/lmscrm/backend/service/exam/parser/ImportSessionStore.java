package com.lmscrm.backend.service.exam.parser;

/**
 * ImportSessionStore — Backend cache for import sessions.
 *
 * Two implementations:
 *   - InMemoryImportSessionStore (single-server, development)
 *   - RedisImportSessionStore   (multi-server, production)
 *
 * Frontend NEVER receives ParseResult.
 * Frontend only receives the importSessionId and sends it back on commit.
 */
public interface ImportSessionStore {

    /** Saves the session and returns the session ID. */
    String save(ImportSession session);

    /**
     * Retrieves the session by ID.
     * @throws com.lmscrm.backend.exception.SessionExpiredException if expired or not found
     */
    ImportSession get(String id);

    /** Deletes the session after successful commit. */
    void delete(String id);

    /** Removes all expired sessions. Called by scheduler. */
    void cleanupExpired();
}
