package com.lmscrm.backend.dto.academic;

import lombok.Data;
import java.util.UUID;

@Data
public class GroupTeacherDto {
    private UUID id;
    private UUID teacherId;
    private String teacherName;
    private UUID subjectId;
    private String subjectName;
}
