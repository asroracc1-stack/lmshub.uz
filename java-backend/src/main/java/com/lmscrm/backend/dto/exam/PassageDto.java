package com.lmscrm.backend.dto.exam;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class PassageDto {
    private UUID id;
    private String title;
    private String content;
    private Integer positionOrder;
    private String imageUrl;
    private List<QuestionDto> questions;
}
