package com.lmscrm.backend.event;

import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.domain.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ExamSubmittedEvent extends ApplicationEvent {

    private final StudentAttempt attempt;
    private final User student;
    private final boolean isPassed;
    private final int correctAnswers;
    private final int totalQuestions;

    public ExamSubmittedEvent(Object source, StudentAttempt attempt, User student, boolean isPassed, int correctAnswers, int totalQuestions) {
        super(source);
        this.attempt = attempt;
        this.student = student;
        this.isPassed = isPassed;
        this.correctAnswers = correctAnswers;
        this.totalQuestions = totalQuestions;
    }
}
