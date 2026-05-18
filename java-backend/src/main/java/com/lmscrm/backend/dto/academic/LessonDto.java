package com.lmscrm.backend.dto.academic;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class LessonDto {
    private UUID id;
    private String title;
    private String description;
    private UUID groupId;
    private String groupName;
    private UUID subjectId;
    private String subjectName;
    private UUID teacherId;
    private String teacherName;
    private String room;
    private String attachmentUrl;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private Boolean isCanceled;
}
