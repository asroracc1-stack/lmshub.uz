package com.lmscrm.backend.listener;

import com.lmscrm.backend.event.ExamPublishedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Handles background operations when an Exam is published.
 * Triggers Cache Invalidation, Search Indexing, and Notifications.
 */
@Component
@Slf4j
public class ExamEventListener {

    @Async
    @EventListener
    public void handleExamPublishedEvent(ExamPublishedEvent event) {
        log.info("BACKGROUND JOB: Exam '{}' (ID: {}, Version: v{}) has been published.", 
                 event.getExamTitle(), event.getExamId(), event.getVersion());
                 
        // 1. Invalidate Redis Cache for Exams List
        invalidateExamCache();
        
        // 2. Update Elasticsearch / Search Index
        updateSearchIndex(event);
        
        // 3. Notify relevant enrolled students
        sendPushNotifications(event);
        
        // 4. Pre-warm Analytics tables for this new version
        preWarmAnalytics(event);
        
        log.info("BACKGROUND JOB: Finished post-publish operations for Exam v{}", event.getVersion());
    }

    private void invalidateExamCache() {
        // CacheEvict logic here
    }

    private void updateSearchIndex(ExamPublishedEvent event) {
        // Index update logic here
    }

    private void sendPushNotifications(ExamPublishedEvent event) {
        // Notification logic here
    }

    private void preWarmAnalytics(ExamPublishedEvent event) {
        // Analytics setup logic here
    }
}
