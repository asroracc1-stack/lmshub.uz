package com.lmscrm.backend.dto.academic;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class LessonDto {
    private UUID id;
    private String title;
    private String description;

    @JsonAlias({"groupId", "group_id"})
    private UUID groupId;
    
    @JsonAlias({"groupName", "group_name"})
    private String groupName;
    
    @JsonAlias({"subjectId", "subject_id"})
    private UUID subjectId;
    
    @JsonAlias({"subjectName", "subject_name"})
    private String subjectName;
    
    @JsonAlias({"teacherId", "teacher_id"})
    private UUID teacherId;
    
    @JsonAlias({"teacherName", "teacher_name"})
    private String teacherName;
    
    private String room;
    
    @JsonAlias({"attachmentUrl", "attachment_url"})
    private String attachmentUrl;
    
    @JsonAlias({"startsAt", "starts_at"})
    private LocalDateTime startsAt;
    
    @JsonAlias({"endsAt", "ends_at"})
    private LocalDateTime endsAt;
    
    @JsonAlias({"isCanceled", "is_canceled"})
    private Boolean isCanceled;
    
    @JsonAlias({"organizationId", "organization_id"})
    private UUID organizationId;
}
