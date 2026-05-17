package com.lmscrm.backend.dto.exam;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QuestionOptionDto {
    private UUID id;
    private String text;
    private Integer positionOrder;
    // We only expose isCorrect for Admins/Teachers, it shouldn't be sent to Students during the test!
    private Boolean isCorrect;
}
