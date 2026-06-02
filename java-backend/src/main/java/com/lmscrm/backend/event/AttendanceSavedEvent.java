package com.lmscrm.backend.event;

import com.lmscrm.backend.domain.enums.AttendanceStatus;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class AttendanceSavedEvent extends ApplicationEvent {
    private final UUID studentId;
    private final UUID lessonId;
    private final UUID subjectId;
    private final AttendanceStatus status;
    private final Integer score;
    private final String comment;
    private final Integer coins;

    public AttendanceSavedEvent(Object source, UUID studentId, UUID lessonId, UUID subjectId, AttendanceStatus status, Integer score, String comment, Integer coins) {
        super(source);
        this.studentId = studentId;
        this.lessonId = lessonId;
        this.subjectId = subjectId;
        this.status = status;
        this.score = score;
        this.comment = comment;
        this.coins = coins;
    }
}
