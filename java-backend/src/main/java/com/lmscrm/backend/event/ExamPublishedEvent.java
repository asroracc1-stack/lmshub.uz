package com.lmscrm.backend.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Event triggered strictly when an Exam is completely finalized and published.
 */
@Getter
public class ExamPublishedEvent extends ApplicationEvent {
    
    private final UUID examId;
    private final String examTitle;
    private final Integer version;

    public ExamPublishedEvent(Object source, UUID examId, String examTitle, Integer version) {
        super(source);
        this.examId = examId;
        this.examTitle = examTitle;
        this.version = version;
    }
}
