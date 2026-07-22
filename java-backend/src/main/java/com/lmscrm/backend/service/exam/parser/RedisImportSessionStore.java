package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.exception.SessionExpiredException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Uncomment when Redis is added to dependencies:
// import org.springframework.context.annotation.Profile;
// import org.springframework.data.redis.core.RedisTemplate;
// import org.springframework.stereotype.Component;
// import java.util.concurrent.TimeUnit;

/**
 * RedisImportSessionStore — Redis-backed session store for multi-server deployments.
 *
 * To activate:
 *   1. Add spring-boot-starter-data-redis to pom.xml
 *   2. Uncomment @Profile("redis") and @Component annotations
 *   3. Configure spring.redis.host / spring.redis.port in application.properties
 *   4. Run with: spring.profiles.active=redis
 *
 * TTL is set to 30 minutes on each save — Redis handles expiry automatically.
 * No scheduled cleanup needed.
 */
// @Profile("redis")
// @Component
@RequiredArgsConstructor
@Slf4j
public class RedisImportSessionStore implements ImportSessionStore {

    // private final RedisTemplate<String, ImportSession> redisTemplate;
    // private static final long TTL_MINUTES = 30;
    // private static final String KEY_PREFIX = "import_session:";

    @Override
    public String save(ImportSession session) {
        // redisTemplate.opsForValue().set(
        //     KEY_PREFIX + session.getId(), session, TTL_MINUTES, TimeUnit.MINUTES
        // );
        // log.info("ImportSession saved to Redis: {}", session.getId());
        // return session.getId();
        throw new UnsupportedOperationException(
            "RedisImportSessionStore is not active. " +
            "Activate spring.profiles.active=redis to use Redis."
        );
    }

    @Override
    public ImportSession get(String id) {
        // ImportSession session = redisTemplate.opsForValue().get(KEY_PREFIX + id);
        // if (session == null) throw new SessionExpiredException(id);
        // return session;
        throw new SessionExpiredException(id);
    }

    @Override
    public void delete(String id) {
        // redisTemplate.delete(KEY_PREFIX + id);
    }

    @Override
    public void cleanupExpired() {
        // Redis handles TTL expiry automatically — no cleanup needed
    }
}
