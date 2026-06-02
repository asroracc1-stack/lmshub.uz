package com.lmscrm.backend.dto.academic;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

/**
 * Response object for `/student/dashboard/lessons` endpoint.
 */
@Data
@AllArgsConstructor
public class StudentLessonResponse {
    @com.fasterxml.jackson.annotation.JsonProperty("lessons")
    private List<StudentLessonDto> lessons;
}
