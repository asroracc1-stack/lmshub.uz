package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.exception.SessionExpiredException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * InMemoryImportSessionStore — ConcurrentHashMap-based session store.
 * Used in single-server / development environments.
 *
 * For multi-server production, switch to RedisImportSessionStore
 * by activating spring.profiles.active=redis
 */
@Component
@Slf4j
public class InMemoryImportSessionStore implements ImportSessionStore {

    private final Map<String, ImportSession> store = new ConcurrentHashMap<>();

    @Override
    public String save(ImportSession session) {
        store.put(session.getId(), session);
        log.info("ImportSession saved: {} (expires: {})", session.getId(), session.getExpiresAt());
        return session.getId();
    }

    @Override
    public ImportSession get(String id) {
        ImportSession session = store.get(id);
        if (session == null || session.isExpired()) {
            store.remove(id);
            throw new SessionExpiredException(id);
        }
        return session;
    }

    @Override
    public void delete(String id) {
        store.remove(id);
        log.info("ImportSession deleted: {}", id);
    }

    /** Runs every 5 minutes to clean up expired sessions. */
    @Override
    @Scheduled(fixedRate = 300_000)
    public void cleanupExpired() {
        int before = store.size();
        Iterator<Map.Entry<String, ImportSession>> it = store.entrySet().iterator();
        while (it.hasNext()) {
            if (it.next().getValue().isExpired()) {
                it.remove();
            }
        }
        int removed = before - store.size();
        if (removed > 0) {
            log.info("ImportSession cleanup: removed {} expired sessions", removed);
        }
    }
}
